"use server";

import { and, asc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { withDbTimeout } from "@/lib/db-timeout";
import { auditLog, pergerakan, sektors, takwimAktiviti, users } from "@/lib/schema";
import { parseLocalInput } from "@/lib/dates";
import { requireUser } from "@/lib/rbac";
import { normalizeLaporanSektorIds } from "@/lib/laporan-sektor-scope";
import {
  canAddTakwim,
  normalizeTakwimSearchTerm,
  type TakwimKategori,
} from "@/lib/takwim-utils";

export type TakwimItem = {
  id: number;
  /** 'bulk' = rancangan tahunan (takwim utama); 'web' = tambahan / pergerakan lain. */
  source: "web" | "bulk";
  takwimKategori: TakwimKategori;
  jenis: "Pergerakan";
  urusan: string;
  lokasi: string;
  sektorCode: string | null;
  sektorName: string | null;
  tarikhPergi: Date;
  tarikhKembali: Date;
};

function monthRangeUtc(month: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const start = new Date(`${month}-01T00:00:00+08:00`);
  const end = new Date(`${month}-${String(lastDay).padStart(2, "0")}T23:59:59+08:00`);
  return { start, end };
}

function yearRangeUtc(year: string): { start: Date; end: Date } | null {
  if (!/^\d{4}$/.test(year)) return null;
  return {
    start: new Date(`${year}-01-01T00:00:00+08:00`),
    end: new Date(`${year}-12-31T23:59:59+08:00`),
  };
}

async function allowedTakwimSektorIds(user: Awaited<ReturnType<typeof requireUser>>) {
  if (!canAddTakwim(user.peranan)) return { allowed: false as const, ids: [] as number[] };

  if (user.peranan === "Admin") {
    return { allowed: true as const, ids: null as number[] | null };
  }

  if (user.peranan === "Ketua_Unit") {
    const sid = user.sektorId != null ? Number(user.sektorId) : null;
    return sid && Number.isFinite(sid)
      ? { allowed: true as const, ids: [sid] }
      : { allowed: false as const, ids: [] };
  }

  if (user.peranan === "Timbalan_PPD") {
    const row = await db.query.users.findFirst({
      where: eq(users.id, Number(user.id)),
      columns: { laporanSektorIds: true },
    });
    const ids = normalizeLaporanSektorIds(row?.laporanSektorIds);
    return ids.length
      ? { allowed: true as const, ids }
      : { allowed: false as const, ids: [] };
  }

  return { allowed: false as const, ids: [] };
}

export async function listAllowedTakwimCreateSektorIds(): Promise<number[] | null> {
  const user = await requireUser();
  const scope = await allowedTakwimSektorIds(user);
  if (!scope.allowed) return [];
  return scope.ids;
}

/**
 * Aktiviti sektor untuk satu bulan (takwim).
 * `sektorIds === "all"` = semua sektor; selainnya tapis kepada sektor dipilih.
 * Tidak mengubah skop kebenaran — semua pengguna boleh lihat (baca sahaja).
 */
export async function listTakwimForMonth(opts: {
  month: string;
  sektorIds: number[] | "all";
}): Promise<TakwimItem[]> {
  await requireUser();

  const range = monthRangeUtc(opts.month);
  if (!range) return [];

  const masterConditions = [
    eq(takwimAktiviti.aktif, true),
    lte(takwimAktiviti.tarikhPergi, range.end),
    gte(takwimAktiviti.tarikhKembali, range.start),
  ];
  const otherConditions = [
    eq(pergerakan.aktif, true),
    eq(pergerakan.jenis, "Pergerakan" as const),
    eq(pergerakan.source, "web" as const),
    isNull(pergerakan.takwimAktivitiId),
    isNull(pergerakan.takwimKategori),
    lte(pergerakan.tarikhPergi, range.end),
    gte(pergerakan.tarikhKembali, range.start),
  ];
  if (opts.sektorIds !== "all") {
    if (opts.sektorIds.length === 0) return [];
    masterConditions.push(inArray(takwimAktiviti.sektorId, opts.sektorIds));
    otherConditions.push(inArray(pergerakan.sektorId, opts.sektorIds));
  }

  const masterRows = await withDbTimeout(
    db
      .select({
        id: takwimAktiviti.id,
        kategori: takwimAktiviti.kategori,
        urusan: takwimAktiviti.urusan,
        lokasi: takwimAktiviti.lokasi,
        sektorCode: sektors.code,
        sektorName: sektors.name,
        tarikhPergi: takwimAktiviti.tarikhPergi,
        tarikhKembali: takwimAktiviti.tarikhKembali,
      })
      .from(takwimAktiviti)
      .leftJoin(sektors, eq(sektors.id, takwimAktiviti.sektorId))
      .where(and(...masterConditions))
      .orderBy(asc(takwimAktiviti.tarikhPergi)),
  );

  const otherRows = await withDbTimeout(
    db
      .select({
        id: pergerakan.id,
        jenis: pergerakan.jenis,
        urusan: pergerakan.urusan,
        lokasi: pergerakan.lokasi,
        sektorCode: sektors.code,
        sektorName: sektors.name,
        tarikhPergi: pergerakan.tarikhPergi,
        tarikhKembali: pergerakan.tarikhKembali,
      })
      .from(pergerakan)
      .leftJoin(sektors, eq(sektors.id, pergerakan.sektorId))
      .where(and(...otherConditions))
      .orderBy(asc(pergerakan.tarikhPergi)),
  );

  return [
    ...masterRows.map((r) => ({
      id: r.id,
      source: r.kategori === "rancangan" ? ("bulk" as const) : ("web" as const),
      takwimKategori: r.kategori === "tambahan" ? ("tambahan" as const) : null,
      jenis: "Pergerakan" as const,
      urusan: r.urusan,
      lokasi: r.lokasi,
      sektorCode: r.sektorCode,
      sektorName: r.sektorName,
      tarikhPergi: new Date(r.tarikhPergi),
      tarikhKembali: new Date(r.tarikhKembali),
    })),
    ...otherRows.map((r) => ({
      id: r.id,
      source: "web" as const,
      takwimKategori: null,
      jenis: "Pergerakan" as const,
      urusan: r.urusan,
      lokasi: r.lokasi,
      sektorCode: r.sektorCode,
      sektorName: r.sektorName,
      tarikhPergi: new Date(r.tarikhPergi),
      tarikhKembali: new Date(r.tarikhKembali),
    })),
  ].sort((a, b) => a.tarikhPergi.getTime() - b.tarikhPergi.getTime());
}

export async function listTakwimForYearSearch(opts: {
  year: string;
  sektorIds: number[] | "all";
  search: string;
  includeOther: boolean;
}): Promise<TakwimItem[]> {
  await requireUser();

  const range = yearRangeUtc(opts.year);
  const search = normalizeTakwimSearchTerm(opts.search);
  if (!range || !search) return [];

  const pattern = `%${search}%`;
  const masterConditions = [
    eq(takwimAktiviti.aktif, true),
    lte(takwimAktiviti.tarikhPergi, range.end),
    gte(takwimAktiviti.tarikhKembali, range.start),
    or(
      ilike(takwimAktiviti.urusan, pattern),
      ilike(takwimAktiviti.lokasi, pattern),
      ilike(sektors.code, pattern),
      ilike(sektors.name, pattern),
      ilike(takwimAktiviti.kategori, pattern),
    ),
  ];

  const otherConditions = [
    eq(pergerakan.aktif, true),
    eq(pergerakan.jenis, "Pergerakan" as const),
    eq(pergerakan.source, "web" as const),
    isNull(pergerakan.takwimAktivitiId),
    isNull(pergerakan.takwimKategori),
    lte(pergerakan.tarikhPergi, range.end),
    gte(pergerakan.tarikhKembali, range.start),
    or(
      ilike(pergerakan.urusan, pattern),
      ilike(pergerakan.lokasi, pattern),
      ilike(sektors.code, pattern),
      ilike(sektors.name, pattern),
      "lain-lain".includes(search.toLowerCase()) || "lain".includes(search.toLowerCase())
        ? sql`true`
        : sql`false`,
    ),
  ];

  if (opts.sektorIds !== "all") {
    if (opts.sektorIds.length === 0) return [];
    masterConditions.push(inArray(takwimAktiviti.sektorId, opts.sektorIds));
    otherConditions.push(inArray(pergerakan.sektorId, opts.sektorIds));
  }

  const masterRows = await withDbTimeout(
    db
      .select({
        id: takwimAktiviti.id,
        kategori: takwimAktiviti.kategori,
        urusan: takwimAktiviti.urusan,
        lokasi: takwimAktiviti.lokasi,
        sektorCode: sektors.code,
        sektorName: sektors.name,
        tarikhPergi: takwimAktiviti.tarikhPergi,
        tarikhKembali: takwimAktiviti.tarikhKembali,
      })
      .from(takwimAktiviti)
      .leftJoin(sektors, eq(sektors.id, takwimAktiviti.sektorId))
      .where(and(...masterConditions))
      .orderBy(asc(takwimAktiviti.tarikhPergi)),
  );

  const otherRows = opts.includeOther
    ? await withDbTimeout(
        db
          .select({
            id: pergerakan.id,
            jenis: pergerakan.jenis,
            urusan: pergerakan.urusan,
            lokasi: pergerakan.lokasi,
            sektorCode: sektors.code,
            sektorName: sektors.name,
            tarikhPergi: pergerakan.tarikhPergi,
            tarikhKembali: pergerakan.tarikhKembali,
          })
          .from(pergerakan)
          .leftJoin(sektors, eq(sektors.id, pergerakan.sektorId))
          .where(and(...otherConditions))
          .orderBy(asc(pergerakan.tarikhPergi)),
      )
    : [];

  return [
    ...masterRows.map((r) => ({
      id: r.id,
      source: r.kategori === "rancangan" ? ("bulk" as const) : ("web" as const),
      takwimKategori: r.kategori === "tambahan" ? ("tambahan" as const) : null,
      jenis: "Pergerakan" as const,
      urusan: r.urusan,
      lokasi: r.lokasi,
      sektorCode: r.sektorCode,
      sektorName: r.sektorName,
      tarikhPergi: new Date(r.tarikhPergi),
      tarikhKembali: new Date(r.tarikhKembali),
    })),
    ...otherRows.map((r) => ({
      id: r.id,
      source: "web" as const,
      takwimKategori: null,
      jenis: "Pergerakan" as const,
      urusan: r.urusan,
      lokasi: r.lokasi,
      sektorCode: r.sektorCode,
      sektorName: r.sektorName,
      tarikhPergi: new Date(r.tarikhPergi),
      tarikhKembali: new Date(r.tarikhKembali),
    })),
  ].sort((a, b) => a.tarikhPergi.getTime() - b.tarikhPergi.getTime());
}

const createTakwimSchema = z
  .object({
    sektorId: z.coerce.number().int().positive("Sektor diperlukan"),
    urusan: z.string().trim().min(1, "Nama aktiviti diperlukan"),
    lokasi: z.string().trim().default(""),
    tarikhPergi: z.string().min(1, "Tarikh mula diperlukan"),
    tarikhKembali: z.string().min(1, "Tarikh tamat diperlukan"),
  })
  .superRefine((value, ctx) => {
    const pergi = parseLocalInput(value.tarikhPergi);
    const kembali = parseLocalInput(value.tarikhKembali);
    if (!pergi) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tarikhPergi"], message: "Tarikh mula tidak sah" });
    }
    if (!kembali) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tarikhKembali"], message: "Tarikh tamat tidak sah" });
    }
    if (pergi && kembali && kembali < pergi) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tarikhKembali"],
        message: "Tarikh tamat mesti selepas tarikh mula",
      });
    }
  });

export type CreateTakwimResult = { ok: true } | { ok: false; error: string };

export async function createTakwimTambahan(input: unknown): Promise<CreateTakwimResult> {
  const user = await requireUser();
  const scope = await allowedTakwimSektorIds(user);
  if (!scope.allowed) return { ok: false, error: "Anda tiada kebenaran menambah takwim." };

  const parsed = createTakwimSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah" };
  }

  const data = parsed.data;
  if (scope.ids && !scope.ids.includes(data.sektorId)) {
    return { ok: false, error: "Sektor di luar skop kebenaran anda." };
  }

  const sektor = await db.query.sektors.findFirst({
    where: eq(sektors.id, data.sektorId),
    columns: { id: true },
  });
  if (!sektor) return { ok: false, error: "Sektor tidak sah." };

  const pergi = parseLocalInput(data.tarikhPergi);
  const kembali = parseLocalInput(data.tarikhKembali);
  if (!pergi || !kembali || kembali < pergi) {
    return { ok: false, error: "Julat tarikh tidak sah." };
  }

  const inserted = await db
    .insert(takwimAktiviti)
    .values({
      sektorId: data.sektorId,
      urusan: data.urusan,
      lokasi: data.lokasi,
      tarikhPergi: pergi,
      tarikhKembali: kembali,
      kategori: "tambahan",
      createdByUserId: Number(user.id),
    })
    .returning({ id: takwimAktiviti.id });

  await db.insert(auditLog).values({
    action: "CREATE_TAKWIM_TAMBAHAN",
    userId: Number(user.id),
    detail: { takwimAktivitiId: inserted[0]?.id, sektorId: data.sektorId },
  });

  revalidatePath("/takwim");
  return { ok: true };
}
