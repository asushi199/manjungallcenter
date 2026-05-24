"use server";

import { and, eq, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { opr, pergerakan, sektors, users } from "@/lib/schema";
import { requireLaporanOprAccess } from "@/lib/rbac";
import {
  intersectSektorIds,
  normalizeLaporanSektorIds,
} from "@/lib/laporan-sektor-scope";

const sektorPg = alias(sektors, "sektor_pg");
const sektorOv = alias(sektors, "sektor_ov");

export type LaporanOprRow = {
  pergerakanId: number;
  oprId: number;
  nama: string;
  jawatan: string;
  urusan: string;
  lokasi: string;
  jenis: "Pergerakan" | "Bercuti";
  tarikhPergi: Date;
  tarikhKembali: Date;
  sektorId: number | null;
  sektorCode: string | null;
  sektorName: string | null;
  updatedAt: Date;
};

export async function getUserLaporanSektorScope(userId: number): Promise<number[]> {
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { peranan: true, laporanSektorIds: true },
  });
  if (!row || row.peranan !== "Timbalan_PPD") return [];
  return normalizeLaporanSektorIds(row.laporanSektorIds);
}

export async function listSiapOprLaporan(opts: {
  start?: Date;
  end?: Date;
  sektorIds?: number[];
}): Promise<LaporanOprRow[]> {
  const sessionUser = await requireLaporanOprAccess();
  const userId = Number(sessionUser.id);

  let effectiveSektorIds = opts.sektorIds;

  if (sessionUser.peranan === "Ketua_Unit") {
    const sid = sessionUser.sektorId != null ? Number(sessionUser.sektorId) : null;
    if (!sid) return [];
    effectiveSektorIds = [sid];
  } else if (sessionUser.peranan === "Timbalan_PPD") {
    const scope = await getUserLaporanSektorScope(userId);
    if (!scope.length) return [];
    effectiveSektorIds = intersectSektorIds(opts.sektorIds, scope);
  }

  const conditions = [eq(opr.status, "SIAP"), eq(pergerakan.aktif, true)];
  if (opts.start && opts.end) {
    conditions.push(lte(pergerakan.tarikhPergi, opts.end));
    conditions.push(gte(pergerakan.tarikhKembali, opts.start));
  }

  const rows = await db
    .select({
      pergerakanId: pergerakan.id,
      oprId: opr.id,
      nama: users.nama,
      jawatan: users.jawatan,
      urusan: pergerakan.urusan,
      lokasi: pergerakan.lokasi,
      jenis: pergerakan.jenis,
      tarikhPergi: pergerakan.tarikhPergi,
      tarikhKembali: pergerakan.tarikhKembali,
      sektorOverrideId: opr.sektorOverrideId,
      pergerakanSektorId: pergerakan.sektorId,
      ovCode: sektorOv.code,
      ovName: sektorOv.name,
      pgCode: sektorPg.code,
      pgName: sektorPg.name,
      updatedAt: opr.updatedAt,
    })
    .from(opr)
    .innerJoin(pergerakan, eq(opr.pergerakanId, pergerakan.id))
    .innerJoin(users, eq(users.id, pergerakan.userId))
    .leftJoin(sektorOv, eq(sektorOv.id, opr.sektorOverrideId))
    .leftJoin(sektorPg, eq(sektorPg.id, pergerakan.sektorId))
    .where(and(...conditions))
    .orderBy(pergerakan.tarikhPergi);

  const mapped: LaporanOprRow[] = rows.map((r) => {
    const useOverride = r.sektorOverrideId != null;
    const sektorId = useOverride ? r.sektorOverrideId : r.pergerakanSektorId;
    return {
      pergerakanId: r.pergerakanId,
      oprId: r.oprId,
      nama: r.nama,
      jawatan: r.jawatan,
      urusan: r.urusan,
      lokasi: r.lokasi,
      jenis: r.jenis,
      tarikhPergi: new Date(r.tarikhPergi),
      tarikhKembali: new Date(r.tarikhKembali),
      sektorId,
      sektorCode: useOverride ? r.ovCode : r.pgCode,
      sektorName: useOverride ? r.ovName : r.pgName,
      updatedAt: new Date(r.updatedAt),
    };
  });

  if (!effectiveSektorIds?.length) return mapped;
  const allowed = new Set(effectiveSektorIds);
  return mapped.filter((r) => r.sektorId != null && allowed.has(r.sektorId));
}
