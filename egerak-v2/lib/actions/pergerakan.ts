"use server";

import { z } from "zod";
import { and, desc, eq, gte, lte, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { withDbTimeout } from "@/lib/db-timeout";
import { pergerakan, users, sektors, auditLog, opr, roomBookings } from "@/lib/schema";
import { requireUser, requireAdmin } from "@/lib/rbac";
import { parseLocalInput, toLocalInput, TZ } from "@/lib/dates";
import { formatInTimeZone } from "date-fns-tz";
import {
  resolveBookableRoomCode,
  syncRoomBookingsFromPergerakan,
  cancelRoomBookingsForPergerakan,
  previewRoomBookingsForPergerakan,
  type RoomBookingPreview,
} from "@/lib/sync-room-bookings";

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
  const { jenis, urusan, lokasi, tarikhPergi, tarikhKembali, sepenuhHari, tempahBilik } =
    parsed.data;
  const pergi = parseLocalInput(tarikhPergi);
  const kembali = parseLocalInput(tarikhKembali);
  if (!pergi || !kembali) return { ok: false, error: "Format tarikh tidak sah" };

  const roomCode = jenis === "Pergerakan" ? resolveBookableRoomCode(lokasi) : null;
  const shouldBookRoom = roomCode != null && tempahBilik !== false;

  try {
    const result = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(pergerakan)
        .values({
          userId: Number(user.id),
          sektorId: user.sektorId,
          jenis,
          urusan: urusan.trim(),
          lokasi: lokasi.trim(),
          tarikhPergi: pergi,
          tarikhKembali: kembali,
          source: "web",
        })
        .returning({ id: pergerakan.id });

      let roomSlotsBooked = 0;
      if (shouldBookRoom && roomCode) {
        const sync = await syncRoomBookingsFromPergerakan(tx, {
          pergerakanId: row.id,
          roomCode,
          userId: Number(user.id),
          title: urusan.trim(),
          pergi,
          kembali,
          fullDay: sepenuhHari === true,
          auditUserId: Number(user.id),
        });
        if (!sync.ok) {
          throw new Error(sync.error);
        }
        roomSlotsBooked = sync.count;
      }

      await tx.insert(auditLog).values({
        action: "SUBMIT_PERGERAKAN",
        userId: Number(user.id),
        detail: { id: row.id, jenis, urusan, lokasi, roomSlotsBooked, tempahBilik: shouldBookRoom },
      });

      return { id: row.id, roomSlotsBooked };
    });

    revalidatePath("/dashboard");
    revalidatePath("/my");
    revalidatePath("/bilik");
    return {
      ok: true,
      id: result.id,
      roomSlotsBooked: result.roomSlotsBooked || undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("Tempahan gagal") || msg.includes("Bilik/dewan") || msg.includes("Masa pergerakan")) {
      return { ok: false, error: msg };
    }
    throw e;
  }
}

export type RoomAvailabilityCheck = RoomBookingPreview & { checking: false };

/** Semak slot bilik sebelum hantar (paparan amaran pada borang). */
export async function checkPergerakanRoomAvailability(input: {
  jenis: "Pergerakan" | "Bercuti";
  lokasi: string;
  tarikhPergi: string;
  tarikhKembali: string;
  sepenuhHari?: boolean;
  tempahBilik?: boolean;
  excludePergerakanId?: number;
}): Promise<RoomAvailabilityCheck> {
  await requireUser();
  const empty: RoomAvailabilityCheck = {
    checking: false,
    applies: false,
    neededSlots: [],
    conflicts: [],
    fullDayBlockedDates: [],
    canBook: true,
    summary: null,
  };

  if (input.jenis !== "Pergerakan") return empty;
  const roomCode = resolveBookableRoomCode(input.lokasi);
  if (!roomCode) return empty;

  if (input.tempahBilik === false) {
    return {
      ...empty,
      applies: true,
      roomName: roomCode === "DEWAN_BESTARI" ? "Dewan Bestari" : "Bilik Budiman",
      canBook: true,
      summary: null,
    };
  }

  const pergi = parseLocalInput(input.tarikhPergi);
  const kembali = parseLocalInput(input.tarikhKembali);
  if (!pergi || !kembali || kembali.getTime() < pergi.getTime()) {
    return {
      ...empty,
      applies: true,
      canBook: false,
      summary: "Tarikh pergi / kembali tidak sah.",
    };
  }

  const preview = await previewRoomBookingsForPergerakan(db, {
    roomCode,
    pergi,
    kembali,
    fullDay: input.sepenuhHari === true,
    excludePergerakanId: input.excludePergerakanId,
  });
  return { ...preview, checking: false };
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
  const { jenis, urusan, lokasi, tarikhPergi, tarikhKembali, sepenuhHari, tempahBilik } =
    parsed.data;
  const pergi = parseLocalInput(tarikhPergi);
  const kembali = parseLocalInput(tarikhKembali);
  if (!pergi || !kembali) return { ok: false, error: "Format tarikh tidak sah" };

  const roomCode = jenis === "Pergerakan" ? resolveBookableRoomCode(lokasi) : null;
  const shouldBookRoom = roomCode != null && tempahBilik !== false;

  try {
    const result = await db.transaction(async (tx) => {
      await tx
        .update(pergerakan)
        .set({
          jenis,
          urusan: urusan.trim(),
          lokasi: lokasi.trim(),
          tarikhPergi: pergi,
          tarikhKembali: kembali,
          updatedAt: new Date(),
        })
        .where(eq(pergerakan.id, id));

      await cancelRoomBookingsForPergerakan(tx, [id], Number(user.id));

      let roomSlotsBooked = 0;
      if (shouldBookRoom && roomCode) {
        const sync = await syncRoomBookingsFromPergerakan(tx, {
          pergerakanId: id,
          roomCode,
          userId: existing.userId,
          title: urusan.trim(),
          pergi,
          kembali,
          fullDay: sepenuhHari === true,
          auditUserId: Number(user.id),
        });
        if (!sync.ok) throw new Error(sync.error);
        roomSlotsBooked = sync.count;
      }

      await tx.insert(auditLog).values({
        action: "UPDATE_PERGERAKAN",
        userId: Number(user.id),
        detail: { id, jenis, urusan, lokasi, roomSlotsBooked, tempahBilik: shouldBookRoom },
      });

      return { id, roomSlotsBooked };
    });

    revalidatePath("/dashboard");
    revalidatePath("/my");
    revalidatePath("/bilik");
    revalidatePath(`/my/${id}/edit`);
    return {
      ok: true,
      id: result.id,
      roomSlotsBooked: result.roomSlotsBooked || undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("Tempahan gagal") || msg.includes("Bilik/dewan") || msg.includes("Masa pergerakan")) {
      return { ok: false, error: msg };
    }
    throw e;
  }
}

export async function deletePergerakanIds(ids: number[]): Promise<{ deleted: number }> {
  const user = await requireUser();
  if (!ids?.length) return { deleted: 0 };
  const isAdmin = user.peranan === "Admin";

  const targets = await db
    .select({ id: pergerakan.id, userId: pergerakan.userId })
    .from(pergerakan)
    .where(inArray(pergerakan.id, ids));

  const allowed = targets
    .filter((t) => isAdmin || t.userId === Number(user.id))
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
  oprStatus: "DRAFT" | "SIAP" | null;
};

/** Medan untuk dashboard / kalendar — tanpa join OPR atau medan tidak perlu. */
export type DashboardPergerakanRow = {
  id: number;
  nama: string;
  jawatan: string;
  sektorCode: string | null;
  sektorName: string | null;
  jenis: "Pergerakan" | "Bercuti";
  urusan: string;
  lokasi: string;
  tarikhPergi: Date;
  tarikhKembali: Date;
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
  const rows = await listPergerakanBetweenRaw(opts);
  return rows.map(({ userId: _u, ...rest }) => rest);
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

/** Semua pergerakan aktif — pentadbir sahaja (untuk padam pukal). */
export async function listAllPergerakanAdmin(): Promise<PergerakanListItem[]> {
  await requireAdmin();
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
    .where(eq(pergerakan.aktif, true))
    .orderBy(desc(pergerakan.tarikhPergi));

  return rows.map((r) => ({
    ...r,
    tarikhPergi: new Date(r.tarikhPergi),
    tarikhKembali: new Date(r.tarikhKembali),
    oprStatus:
      r.oprStatus === "DRAFT" || r.oprStatus === "SIAP" ? r.oprStatus : null,
  }));
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
      r.oprStatus === "DRAFT" || r.oprStatus === "SIAP" ? r.oprStatus : null,
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
