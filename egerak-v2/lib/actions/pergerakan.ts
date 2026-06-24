"use server";

import { z } from "zod";
import { and, desc, eq, gte, isNull, lte, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { withDbTimeout } from "@/lib/db-timeout";
import {
  pergerakan,
  users,
  sektors,
  auditLog,
  opr,
  roomBookings,
  rooms,
  takwimAktiviti,
} from "@/lib/schema";
import type { OprStatus } from "@/lib/opr-status";
import { requireUser, requireSectorPergerakanAdmin } from "@/lib/rbac";
import { isSektorIdInScope, resolveUserSektorScope } from "@/lib/sektor-admin-scope";
import { canSectorDeletePergerakan, isFullAdmin } from "@/lib/roles";
import { parseLocalInput, toLocalInput, TZ, ymd, formatDateTime } from "@/lib/dates";
import { formatInTimeZone } from "date-fns-tz";
import { buildDayUrusanCadangan, rankCadanganBySektor } from "@/lib/analisis/day-activity-templates";
import { addDays, parseISO } from "date-fns";
import { cancelRoomBookingsForPergerakan } from "@/lib/sync-room-bookings";
import { formatTitleCase } from "@/lib/format-display-text";

function normalizePergerakanText(urusan: string, lokasi: string) {
  return {
    urusan: formatTitleCase(urusan),
    lokasi: formatTitleCase(lokasi),
  };
}

const submitSchema = z
  .object({
    jenis: z.enum(["Pergerakan", "Bercuti"]),
    urusan: z.string().min(1, "Urusan diperlukan").max(500),
    lokasi: z.string().max(200).default(""),
    tarikhPergi: z.string().min(1, "Tarikh pergi diperlukan"),
    tarikhKembali: z.string().min(1, "Tarikh kembali diperlukan"),
    sepenuhHari: z.boolean().optional(),
    /** Lalai true: tempah slot AM/PM. false = sertai aktiviti sedia ada, hanya rekod pergerakan. */
    tempahBilik: z.boolean().optional(),
    /** Sertai aktiviti — laporan oleh penganjur lain; cipta OPR status TIADA. */
    tidakPerluOpr: z.boolean().optional(),
  })
  .refine(
    (v) => {
      const a = parseLocalInput(v.tarikhPergi);
      const b = parseLocalInput(v.tarikhKembali);
      return a && b && b.getTime() >= a.getTime();
    },
    { message: "Tarikh kembali mesti selepas / sama dengan tarikh pergi" },
  );

export type SubmitResult =
  | { ok: true; id: number; roomSlotsBooked?: number }
  | { ok: false; error: string };

export type UpdateResult = SubmitResult;

function inferSepenuhHari(pergi: Date, kembali: Date): boolean {
  const p = formatInTimeZone(pergi, TZ, "HH:mm");
  const k = formatInTimeZone(kembali, TZ, "HH:mm");
  return p === "08:00" && k === "17:00";
}

async function loadPergerakanForUser(id: number, user: Awaited<ReturnType<typeof requireUser>>) {
  const row = await db.query.pergerakan.findFirst({
    where: eq(pergerakan.id, id),
  });
  if (!row || !row.aktif) return null;
  const isAdmin = user.peranan === "Admin";
  if (!isAdmin && row.userId !== Number(user.id)) return null;
  return row;
}

export async function submitPergerakan(input: unknown): Promise<SubmitResult> {
  const user = await requireUser();
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah" };
  }
  const {
    jenis,
    tarikhPergi,
    tarikhKembali,
    tidakPerluOpr,
  } = parsed.data;
  const { urusan, lokasi } = normalizePergerakanText(
    parsed.data.urusan,
    parsed.data.lokasi,
  );
  const pergi = parseLocalInput(tarikhPergi);
  const kembali = parseLocalInput(tarikhKembali);
  if (!pergi || !kembali) return { ok: false, error: "Format tarikh tidak sah" };

  // Tiada lagi tempahan bilik dari pergerakan; tempahan hanya via takwim + /bilik.
  try {
    const result = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(pergerakan)
        .values({
          userId: Number(user.id),
          sektorId: user.sektorId,
          jenis,
          urusan,
          lokasi,
          tarikhPergi: pergi,
          tarikhKembali: kembali,
          source: "web",
        })
        .returning({ id: pergerakan.id });

      if (jenis === "Pergerakan" && tidakPerluOpr === true) {
        await tx.insert(opr).values({ pergerakanId: row.id, status: "TIADA" });
      }

      await tx.insert(auditLog).values({
        action: "SUBMIT_PERGERAKAN",
        userId: Number(user.id),
        detail: { id: row.id, jenis, urusan, lokasi, tidakPerluOpr: tidakPerluOpr === true },
      });

      return { id: row.id };
    });

    revalidatePath("/dashboard");
    revalidatePath("/my");
    return { ok: true, id: result.id };
  } catch (e) {
    throw e;
  }
}

export type PergerakanEditData = {
  id: number;
  jenis: "Pergerakan" | "Bercuti";
  urusan: string;
  lokasi: string;
  tarikhPergi: string;
  tarikhKembali: string;
  sepenuhHari: boolean;
  /** true jika rekod ini ada tempahan bilik/dewan aktif (penganjur). */
  tempahBilik: boolean;
};

export async function getPergerakanForEdit(id: number): Promise<PergerakanEditData | null> {
  const user = await requireUser();
  const row = await loadPergerakanForUser(id, user);
  if (!row) return null;

  const activeBooking = await db.query.roomBookings.findFirst({
    where: and(eq(roomBookings.pergerakanId, id), eq(roomBookings.status, "BOOKED")),
    columns: { id: true },
  });

  return {
    id: row.id,
    jenis: row.jenis,
    urusan: row.urusan,
    lokasi: row.lokasi,
    tarikhPergi: toLocalInput(new Date(row.tarikhPergi)),
    tarikhKembali: toLocalInput(new Date(row.tarikhKembali)),
    sepenuhHari: inferSepenuhHari(new Date(row.tarikhPergi), new Date(row.tarikhKembali)),
    tempahBilik: !!activeBooking,
  };
}

export async function updatePergerakan(id: number, input: unknown): Promise<UpdateResult> {
  const user = await requireUser();
  const existing = await loadPergerakanForUser(id, user);
  if (!existing) return { ok: false, error: "Rekod tidak dijumpai atau tiada kebenaran" };

  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah" };
  }
  const { jenis, tarikhPergi, tarikhKembali } = parsed.data;
  const { urusan, lokasi } = normalizePergerakanText(
    parsed.data.urusan,
    parsed.data.lokasi,
  );
  const pergi = parseLocalInput(tarikhPergi);
  const kembali = parseLocalInput(tarikhKembali);
  if (!pergi || !kembali) return { ok: false, error: "Format tarikh tidak sah" };

  try {
    const result = await db.transaction(async (tx) => {
      await tx
        .update(pergerakan)
        .set({ jenis, urusan, lokasi, tarikhPergi: pergi, tarikhKembali: kembali, updatedAt: new Date() })
        .where(eq(pergerakan.id, id));

      await tx.insert(auditLog).values({
        action: "UPDATE_PERGERAKAN",
        userId: Number(user.id),
        detail: { id, jenis, urusan, lokasi },
      });

      return { id };
    });

    revalidatePath("/dashboard");
    revalidatePath("/my");
    revalidatePath(`/my/${id}/edit`);
    return { ok: true, id: result.id };
  } catch (e) {
    throw e;
  }
}

export async function deletePergerakanIds(ids: number[]): Promise<{ deleted: number }> {
  const user = await requireUser();
  if (!ids?.length) return { deleted: 0 };

  const scope = await resolveUserSektorScope(user);
  const mayDeleteBySektor = canSectorDeletePergerakan(user.peranan);

  const targets = await db
    .select({
      id: pergerakan.id,
      userId: pergerakan.userId,
      sektorId: pergerakan.sektorId,
    })
    .from(pergerakan)
    .where(inArray(pergerakan.id, ids));

  const allowed = targets
    .filter((t) => {
      if (isFullAdmin(user.peranan)) return true;
      if (mayDeleteBySektor && isSektorIdInScope(t.sektorId, scope)) return true;
      return t.userId === Number(user.id);
    })
    .map((t) => t.id);

  if (!allowed.length) return { deleted: 0 };

  await db.transaction(async (tx) => {
    await cancelRoomBookingsForPergerakan(tx, allowed, Number(user.id));
    await tx
      .update(pergerakan)
      .set({ aktif: false, updatedAt: new Date() })
      .where(inArray(pergerakan.id, allowed));
    await tx.insert(auditLog).values({
      action: "DELETE_PERGERAKAN",
      userId: Number(user.id),
      detail: { ids: allowed },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/my");
  revalidatePath("/bilik");
  revalidatePath("/admin/pergerakan");
  revalidatePath("/admin/laporan-opr");
  return { deleted: allowed.length };
}

export type PergerakanListItem = {
  id: number;
  userId: number;
  nama: string;
  jawatan: string;
  sektorCode: string | null;
  sektorName: string | null;
  jenis: "Pergerakan" | "Bercuti";
  urusan: string;
  lokasi: string;
  tarikhPergi: Date;
  tarikhKembali: Date;
  oprStatus: OprStatus | null;
};

/** Medan untuk dashboard / kalendar — tanpa join OPR atau medan tidak perlu. */
export type DashboardPergerakanRow = {
  id: number;
  userId: number;
  nama: string;
  jawatan: string;
  sektorCode: string | null;
  sektorName: string | null;
  jenis: "Pergerakan" | "Bercuti";
  urusan: string;
  lokasi: string;
  tarikhPergi: Date;
  tarikhKembali: Date;
  oprStatus: OprStatus | null;
};

export async function listPergerakanBetween(opts: {
  start: Date;
  end: Date;
  sektorIds?: number[];
  includeCuti?: boolean;
}): Promise<PergerakanListItem[]> {
  const rows = await listPergerakanBetweenRaw(opts);
  return rows.map((r) => ({ ...r, oprStatus: null as PergerakanListItem["oprStatus"] }));
}

/** Query kalendar dashboard — medan minimum, indeks aktif+tarikh. */
export async function listPergerakanForDashboard(opts: {
  start: Date;
  end: Date;
  sektorIds?: number[];
  includeCuti?: boolean;
}): Promise<DashboardPergerakanRow[]> {
  const rows = await listPergerakanForDashboardRaw(opts);
  return rows.map((r) => ({
    ...r,
    tarikhPergi: new Date(r.tarikhPergi),
    tarikhKembali: new Date(r.tarikhKembali),
    oprStatus:
      r.oprStatus === "DRAFT" || r.oprStatus === "SIAP" || r.oprStatus === "TIADA"
        ? r.oprStatus
        : null,
  }));
}

async function listPergerakanForDashboardRaw(opts: {
  start: Date;
  end: Date;
  sektorIds?: number[];
  includeCuti?: boolean;
}) {
  await requireUser();
  const conditions = [
    eq(pergerakan.aktif, true),
    lte(pergerakan.tarikhPergi, opts.end),
    gte(pergerakan.tarikhKembali, opts.start),
  ];
  if (opts.sektorIds?.length) {
    conditions.push(inArray(pergerakan.sektorId, opts.sektorIds));
  }
  if (!opts.includeCuti) {
    conditions.push(eq(pergerakan.jenis, "Pergerakan"));
  }

  return withDbTimeout(
    db
      .select({
        id: pergerakan.id,
        userId: pergerakan.userId,
        nama: users.nama,
        jawatan: users.jawatan,
        sektorCode: sektors.code,
        sektorName: sektors.name,
        jenis: pergerakan.jenis,
        urusan: pergerakan.urusan,
        lokasi: pergerakan.lokasi,
        tarikhPergi: pergerakan.tarikhPergi,
        tarikhKembali: pergerakan.tarikhKembali,
        oprStatus: opr.status,
      })
      .from(pergerakan)
      .innerJoin(users, eq(users.id, pergerakan.userId))
      .leftJoin(sektors, eq(sektors.id, pergerakan.sektorId))
      .leftJoin(opr, eq(opr.pergerakanId, pergerakan.id))
      .where(and(...conditions))
      .orderBy(pergerakan.tarikhPergi),
  );
}

async function listPergerakanBetweenRaw(opts: {
  start: Date;
  end: Date;
  sektorIds?: number[];
  includeCuti?: boolean;
}) {
  await requireUser();
  const conditions = [
    eq(pergerakan.aktif, true),
    lte(pergerakan.tarikhPergi, opts.end),
    gte(pergerakan.tarikhKembali, opts.start),
  ];
  if (opts.sektorIds?.length) {
    conditions.push(inArray(pergerakan.sektorId, opts.sektorIds));
  }
  if (!opts.includeCuti) {
    conditions.push(eq(pergerakan.jenis, "Pergerakan"));
  }

  const rows = await withDbTimeout(
    db
      .select({
        id: pergerakan.id,
        userId: pergerakan.userId,
        nama: users.nama,
        jawatan: users.jawatan,
        sektorCode: sektors.code,
        sektorName: sektors.name,
        jenis: pergerakan.jenis,
        urusan: pergerakan.urusan,
        lokasi: pergerakan.lokasi,
        tarikhPergi: pergerakan.tarikhPergi,
        tarikhKembali: pergerakan.tarikhKembali,
      })
      .from(pergerakan)
      .innerJoin(users, eq(users.id, pergerakan.userId))
      .leftJoin(sektors, eq(sektors.id, pergerakan.sektorId))
      .where(and(...conditions))
      .orderBy(pergerakan.tarikhPergi),
  );

  return rows.map((r) => ({
    ...r,
    tarikhPergi: new Date(r.tarikhPergi),
    tarikhKembali: new Date(r.tarikhKembali),
  }));
}

/** Pergerakan aktif untuk padam pukal — Admin (semua) atau Ketua/Timbalan (ikut skop sektor). */
export async function listPergerakanForSectorAdmin(year?: number): Promise<PergerakanListItem[]> {
  const user = await requireSectorPergerakanAdmin();
  const scope = await resolveUserSektorScope(user);
  if (scope.noAccess) return [];

  const conditions = [eq(pergerakan.aktif, true)];
  if (!scope.allSectors) {
    conditions.push(inArray(pergerakan.sektorId, scope.allowedIds));
  }
  if (year) {
    conditions.push(gte(pergerakan.tarikhPergi, new Date(`${year}-01-01T00:00:00+08:00`)));
    conditions.push(lte(pergerakan.tarikhPergi, new Date(`${year}-12-31T23:59:59+08:00`)));
  }

  const rows = await db
    .select({
      id: pergerakan.id,
      userId: pergerakan.userId,
      nama: users.nama,
      jawatan: users.jawatan,
      sektorCode: sektors.code,
      sektorName: sektors.name,
      jenis: pergerakan.jenis,
      urusan: pergerakan.urusan,
      lokasi: pergerakan.lokasi,
      tarikhPergi: pergerakan.tarikhPergi,
      tarikhKembali: pergerakan.tarikhKembali,
      oprStatus: opr.status,
    })
    .from(pergerakan)
    .innerJoin(users, eq(users.id, pergerakan.userId))
    .leftJoin(sektors, eq(sektors.id, pergerakan.sektorId))
    .leftJoin(opr, eq(opr.pergerakanId, pergerakan.id))
    .where(and(...conditions))
    .orderBy(desc(pergerakan.tarikhPergi));

  return rows.map((r) => ({
    ...r,
    tarikhPergi: new Date(r.tarikhPergi),
    tarikhKembali: new Date(r.tarikhKembali),
    oprStatus:
      r.oprStatus === "DRAFT" || r.oprStatus === "SIAP" || r.oprStatus === "TIADA"
        ? r.oprStatus
        : null,
  }));
}

/** @deprecated Guna listPergerakanForSectorAdmin */
export async function listAllPergerakanAdmin(): Promise<PergerakanListItem[]> {
  return listPergerakanForSectorAdmin();
}

export async function listMine(): Promise<PergerakanListItem[]> {
  const user = await requireUser();
  const rows = await db
    .select({
      id: pergerakan.id,
      userId: pergerakan.userId,
      nama: users.nama,
      jawatan: users.jawatan,
      sektorCode: sektors.code,
      sektorName: sektors.name,
      jenis: pergerakan.jenis,
      urusan: pergerakan.urusan,
      lokasi: pergerakan.lokasi,
      tarikhPergi: pergerakan.tarikhPergi,
      tarikhKembali: pergerakan.tarikhKembali,
      oprStatus: opr.status,
    })
    .from(pergerakan)
    .innerJoin(users, eq(users.id, pergerakan.userId))
    .leftJoin(sektors, eq(sektors.id, pergerakan.sektorId))
    .leftJoin(opr, eq(opr.pergerakanId, pergerakan.id))
    .where(and(eq(pergerakan.userId, Number(user.id)), eq(pergerakan.aktif, true)))
    .orderBy(desc(pergerakan.tarikhPergi));

  return rows.map((r) => ({
    ...r,
    tarikhPergi: new Date(r.tarikhPergi),
    tarikhKembali: new Date(r.tarikhKembali),
    oprStatus:
      r.oprStatus === "DRAFT" || r.oprStatus === "SIAP" || r.oprStatus === "TIADA"
        ? r.oprStatus
        : null,
  }));
}

/**
 * Lokasi terbaru untuk pengguna sendiri (untuk auto-isi borang).
 * Ringan: ambil beberapa rekod terkini, dedupe di server.
 */
export async function listMyRecentLokasi(limit = 10): Promise<string[]> {
  const user = await requireUser();
  const rows = await withDbTimeout(
    db
      .select({ lokasi: pergerakan.lokasi })
      .from(pergerakan)
      .where(and(eq(pergerakan.userId, Number(user.id)), eq(pergerakan.aktif, true)))
      .orderBy(desc(pergerakan.tarikhPergi))
      .limit(Math.max(limit * 5, 30)),
  );

  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const loc = String(r.lokasi || "").trim();
    if (!loc) continue;
    const key = loc.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(loc);
    if (out.length >= limit) break;
  }
  return out;
}

export type LokasiSuggestion = { label: string; count: number };

function lokasiKeyForSuggest(raw: string): string {
  let s = String(raw || "").trim().toLowerCase();
  if (!s) return "";
  // buang simbol asas
  s = s.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ");
  // samakan singkatan sekolah
  s = s.replace(/\bsk\b/g, "sekolah kebangsaan");
  s = s.replace(/\bsmk\b/g, "sekolah menengah kebangsaan");
  s = s.replace(/\bsjkc\b/g, "sekolah jenis kebangsaan cina");
  s = s.replace(/\bsjkt\b/g, "sekolah jenis kebangsaan tamil");
  // buang kata yang kerap tidak membezakan lokasi (cukup ringan)
  s = s.replace(/\b(sekolah|kebangsaan|jenis|cina|tamil|menengah)\b/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Cadangan lokasi pada tarikh tertentu (untuk elak variasi ejaan).
 * Tidak pulang nama pegawai/urusan — hanya senarai lokasi + kiraan.
 */
export async function listLokasiSuggestionsForDay(
  ymdDate: string,
  limit = 8,
): Promise<LokasiSuggestion[]> {
  await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymdDate)) return [];

  const start = new Date(`${ymdDate}T00:00:00+08:00`);
  const end = new Date(`${ymdDate}T23:59:59+08:00`);
  const rows = await withDbTimeout(
    db
      .select({ lokasi: pergerakan.lokasi })
      .from(pergerakan)
      .where(and(eq(pergerakan.aktif, true), lte(pergerakan.tarikhPergi, end), gte(pergerakan.tarikhKembali, start)))
      .orderBy(desc(pergerakan.tarikhPergi))
      .limit(200),
  );

  const clusters = new Map<string, { best: string; count: number }>();
  for (const r of rows) {
    const loc = String(r.lokasi || "").trim();
    if (!loc) continue;
    const key = lokasiKeyForSuggest(loc);
    if (!key) continue;
    const hit = clusters.get(key);
    if (hit) {
      hit.count += 1;
      // pilih label lebih lengkap untuk dipaparkan
      if (loc.length > hit.best.length) hit.best = loc;
    } else {
      clusters.set(key, { best: loc, count: 1 });
    }
  }

  return [...clusters.values()]
    .sort((a, b) => b.count - a.count || b.best.length - a.best.length)
    .slice(0, limit)
    .map((c) => ({ label: c.best, count: c.count }));
}

export type UrusanTemplate = {
  urusan: string;
  lokasi: string;
  tarikhPergi: string;
  tarikhKembali: string;
  count: number;
};

/**
 * Cadangan urusan (aktiviti) pada tarikh tertentu.
 * Aktiviti PPD pada hari itu: satu baris setiap urusan (hampir sama), lokasi ikut rekod pertama.
 * Sumber: rekod `pergerakan` sedia ada + aktiviti master Rancangan Tahunan yang belum ada
 * pegawai bertanggungjawab (takwim_aktiviti tanpa pergerakan), supaya pegawai boleh "ambil"
 * aktiviti rancangan walaupun tiada owner. Tidak pulang nama pegawai.
 */
export async function listUrusanTemplatesForDay(ymdDate: string): Promise<UrusanTemplate[]> {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymdDate)) return [];

  const start = new Date(`${ymdDate}T00:00:00+08:00`);
  const end = new Date(`${ymdDate}T23:59:59+08:00`);
  const rows = await withDbTimeout(
    db
      .select({
        urusan: pergerakan.urusan,
        lokasi: pergerakan.lokasi,
        tarikhPergi: pergerakan.tarikhPergi,
        tarikhKembali: pergerakan.tarikhKembali,
        sektorId: pergerakan.sektorId,
      })
      .from(pergerakan)
      .where(
        and(
          eq(pergerakan.aktif, true),
          eq(pergerakan.jenis, "Pergerakan"),
          lte(pergerakan.tarikhPergi, end),
          gte(pergerakan.tarikhKembali, start),
        ),
      )
      .orderBy(desc(pergerakan.tarikhPergi))
      .limit(500),
  );

  // Aktiviti Takwim (Rancangan Tahunan + Tambahan sektor) tanpa pegawai bertanggungjawab —
  // hanya wujud sebagai takwim_aktiviti (tiada pergerakan), jadi gabungkan supaya turut
  // jadi cadangan untuk pegawai "ambil" semasa Daftar Pergerakan.
  const masterRows = await withDbTimeout(
    db
      .select({
        urusan: takwimAktiviti.urusan,
        lokasi: takwimAktiviti.lokasi,
        tarikhPergi: takwimAktiviti.tarikhPergi,
        tarikhKembali: takwimAktiviti.tarikhKembali,
        sektorId: takwimAktiviti.sektorId,
      })
      .from(takwimAktiviti)
      .where(
        and(
          eq(takwimAktiviti.aktif, true),
          inArray(takwimAktiviti.kategori, ["rancangan", "tambahan"]),
          isNull(takwimAktiviti.sourcePergerakanId),
          lte(takwimAktiviti.tarikhPergi, end),
          gte(takwimAktiviti.tarikhKembali, start),
        ),
      )
      .limit(500),
  );

  const templates = buildDayUrusanCadangan(
    [...rows, ...masterRows].map((r) => ({
      urusan: String(r.urusan || ""),
      lokasi: String(r.lokasi || ""),
      tarikhPergi: new Date(r.tarikhPergi),
      tarikhKembali: new Date(r.tarikhKembali),
      sektorId: r.sektorId ?? null,
    })),
  );

  const ownSektorId =
    user.sektorId != null && Number.isFinite(Number(user.sektorId))
      ? Number(user.sektorId)
      : null;

  return rankCadanganBySektor(templates, ownSektorId).map((g) => ({
    urusan: g.urusan,
    lokasi: g.lokasi,
    tarikhPergi: toLocalInput(g.tarikhPergi),
    tarikhKembali: toLocalInput(g.tarikhKembali),
    count: g.count,
  }));
}

export type MyDayPergerakan = {
  id: number;
  jenis: "Pergerakan" | "Bercuti";
  urusan: string;
  lokasi: string;
  tarikhPergiLabel: string;
  tarikhKembaliLabel: string;
};

/** Rekod pergerakan sendiri yang bertindih dengan hari dipilih (untuk peringatan). */
export async function listMyPergerakanOnDay(
  ymdDate: string,
  excludeId?: number,
): Promise<MyDayPergerakan[]> {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymdDate)) return [];

  const start = new Date(`${ymdDate}T00:00:00+08:00`);
  const end = new Date(`${ymdDate}T23:59:59+08:00`);

  const conditions = [
    eq(pergerakan.aktif, true),
    eq(pergerakan.userId, Number(user.id)),
    lte(pergerakan.tarikhPergi, end),
    gte(pergerakan.tarikhKembali, start),
  ];

  const rows = await withDbTimeout(
    db
      .select({
        id: pergerakan.id,
        jenis: pergerakan.jenis,
        urusan: pergerakan.urusan,
        lokasi: pergerakan.lokasi,
        tarikhPergi: pergerakan.tarikhPergi,
        tarikhKembali: pergerakan.tarikhKembali,
      })
      .from(pergerakan)
      .where(and(...conditions))
      .orderBy(pergerakan.tarikhPergi),
  );

  return rows
    .filter((r) => excludeId == null || r.id !== excludeId)
    .map((r) => ({
      id: r.id,
      jenis: r.jenis as "Pergerakan" | "Bercuti",
      urusan: r.urusan,
      lokasi: r.lokasi,
      tarikhPergiLabel: formatDateTime(new Date(r.tarikhPergi)),
      tarikhKembaliLabel: formatDateTime(new Date(r.tarikhKembali)),
    }));
}

function expandPergerakanDayKeys(
  pergi: Date,
  kembali: Date,
  rangeStartYmd: string,
  rangeEndYmd: string,
): string[] {
  const startYmd = ymd(pergi) > rangeStartYmd ? ymd(pergi) : rangeStartYmd;
  const endYmd = ymd(kembali) < rangeEndYmd ? ymd(kembali) : rangeEndYmd;
  if (startYmd > endYmd) return [];

  const keys: string[] = [];
  let cur = parseISO(`${startYmd}T12:00:00`);
  const end = parseISO(`${endYmd}T12:00:00`);
  while (cur <= end) {
    keys.push(ymd(cur));
    cur = addDays(cur, 1);
  }
  return keys;
}

/** Hari dalam bulan yang pengguna sudah ada pergerakan/cuti aktif (untuk kalendar utama). */
export async function listMyPergerakanDayKeysInMonth(month: string): Promise<string[]> {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}$/.test(month)) return [];

  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const rangeStartYmd = `${month}-01`;
  const rangeEndYmd = `${month}-${String(lastDay).padStart(2, "0")}`;
  const start = new Date(`${rangeStartYmd}T00:00:00+08:00`);
  const end = new Date(`${rangeEndYmd}T23:59:59+08:00`);

  const rows = await withDbTimeout(
    db
      .select({
        tarikhPergi: pergerakan.tarikhPergi,
        tarikhKembali: pergerakan.tarikhKembali,
      })
      .from(pergerakan)
      .where(
        and(
          eq(pergerakan.aktif, true),
          eq(pergerakan.userId, Number(user.id)),
          lte(pergerakan.tarikhPergi, end),
          gte(pergerakan.tarikhKembali, start),
        ),
      ),
  );

  const set = new Set<string>();
  for (const r of rows) {
    for (const key of expandPergerakanDayKeys(
      new Date(r.tarikhPergi),
      new Date(r.tarikhKembali),
      rangeStartYmd,
      rangeEndYmd,
    )) {
      set.add(key);
    }
  }
  return [...set].sort();
}

export async function countToday(): Promise<{ pergerakan: number; bercuti: number; total: number }> {
  await requireUser();
  const ymd = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
  const start = new Date(`${ymd}T00:00:00+08:00`);
  const end = new Date(`${ymd}T23:59:59+08:00`);

  const rows = await withDbTimeout(
    db
      .select({
        jenis: pergerakan.jenis,
        count: sql<number>`count(*)::int`,
      })
      .from(pergerakan)
      .where(
        and(
          eq(pergerakan.aktif, true),
          lte(pergerakan.tarikhPergi, end),
          gte(pergerakan.tarikhKembali, start),
        ),
      )
      .groupBy(pergerakan.jenis),
  );

  let p = 0;
  let c = 0;
  for (const r of rows) {
    if (r.jenis === "Pergerakan") p += Number(r.count);
    else c += Number(r.count);
  }
  return { pergerakan: p, bercuti: c, total: p + c };
}

export type RoomCadangan = { title: string; kind: "AM" | "PM" | "FULL" };

/** Cadangan urusan untuk Budiman/Bestari = tempahan sebenar bilik pada hari itu. */
export async function listRoomBookingCadanganForDay(
  roomCode: "BILIK_BUDIMAN" | "DEWAN_BESTARI",
  ymdDate: string,
): Promise<RoomCadangan[]> {
  await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymdDate)) return [];

  const room = await withDbTimeout(
    db.query.rooms.findFirst({ where: eq(rooms.code, roomCode) }),
  );
  if (!room) return [];

  const rows = await withDbTimeout(
    db
      .select({ slot: roomBookings.slot, title: roomBookings.title })
      .from(roomBookings)
      .where(
        and(
          eq(roomBookings.roomId, room.id),
          eq(roomBookings.tarikh, ymdDate),
          eq(roomBookings.status, "BOOKED"),
        ),
      ),
  );

  const am = rows.find((r) => r.slot === "AM");
  const pm = rows.find((r) => r.slot === "PM");
  // Sepanjang hari (tajuk AM == PM) → satu entri.
  if (am && pm && am.title === pm.title) return [{ title: am.title, kind: "FULL" }];
  const out: RoomCadangan[] = [];
  if (am) out.push({ title: am.title, kind: "AM" });
  if (pm) out.push({ title: pm.title, kind: "PM" });
  return out;
}
