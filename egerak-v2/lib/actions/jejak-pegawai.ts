"use server";

import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { withDbTimeout } from "@/lib/db-timeout";
import { pergerakan, users, sektors, opr } from "@/lib/schema";
import type { OprStatus } from "@/lib/opr-status";
import { requireJejakPegawaiAccess, type SessionUser } from "@/lib/rbac";
import { canTrackAllPegawai } from "@/lib/roles";

/** Skop jejak: Admin/Penyelia/Timbalan lihat semua; Ketua Unit sektor sendiri sahaja. */
type JejakScope =
  | { allSectors: true }
  | { allSectors: false; sektorId: number }
  | { noAccess: true };

function resolveJejakScope(user: SessionUser): JejakScope {
  if (canTrackAllPegawai(user.peranan)) {
    return { allSectors: true };
  }
  if (user.peranan === "Ketua_Unit") {
    const sid = user.sektorId != null ? Number(user.sektorId) : null;
    if (!sid || !Number.isFinite(sid)) return { noAccess: true };
    return { allSectors: false, sektorId: sid };
  }
  return { noAccess: true };
}

export type PegawaiOption = {
  id: number;
  nama: string;
  jawatan: string;
  sektorCode: string | null;
  sektorName: string | null;
};

/** Senarai pegawai (aktif) dalam skop pengguna — untuk pemilih jejak. */
export async function listPegawaiForJejak(): Promise<PegawaiOption[]> {
  const user = await requireJejakPegawaiAccess();
  const scope = resolveJejakScope(user);
  if ("noAccess" in scope) return [];

  const conditions = [eq(users.aktif, true)];
  if (!scope.allSectors) {
    conditions.push(eq(users.sektorId, scope.sektorId));
  }

  const rows = await withDbTimeout(
    db
      .select({
        id: users.id,
        nama: users.nama,
        jawatan: users.jawatan,
        sektorCode: sektors.code,
        sektorName: sektors.name,
      })
      .from(users)
      .leftJoin(sektors, eq(sektors.id, users.sektorId))
      .where(and(...conditions))
      .orderBy(asc(users.nama)),
  );

  return rows;
}

export type JejakItem = {
  id: number;
  jenis: "Pergerakan" | "Bercuti";
  urusan: string;
  lokasi: string;
  sektorCode: string | null;
  sektorName: string | null;
  tarikhPergi: Date;
  tarikhKembali: Date;
  oprStatus: OprStatus | null;
};

export type JejakSummary = {
  total: number;
  pergerakan: number;
  bercuti: number;
  oprSiap: number;
  oprDraf: number;
  oprTiada: number;
  /** Pergerakan tanpa OPR siap/tiada — perlu tindakan (belum jana / draf). */
  oprPerluTindakan: number;
};

export type JejakPegawai = {
  pegawai: PegawaiOption;
  items: JejakItem[];
  summary: JejakSummary;
};

function normalizeOprStatus(s: string | null): OprStatus | null {
  return s === "DRAFT" || s === "SIAP" || s === "TIADA" ? s : null;
}

/** Rekod pergerakan seorang pegawai (ikut tahun), selepas semakan skop. */
export async function getPegawaiJejak(
  pegawaiId: number,
  year?: number,
): Promise<JejakPegawai | null> {
  const user = await requireJejakPegawaiAccess();
  const scope = resolveJejakScope(user);
  if ("noAccess" in scope) return null;
  if (!Number.isFinite(pegawaiId) || pegawaiId <= 0) return null;

  const target = await db
    .select({
      id: users.id,
      nama: users.nama,
      jawatan: users.jawatan,
      sektorId: users.sektorId,
      sektorCode: sektors.code,
      sektorName: sektors.name,
    })
    .from(users)
    .leftJoin(sektors, eq(sektors.id, users.sektorId))
    .where(eq(users.id, pegawaiId))
    .limit(1);

  const pegawai = target[0];
  if (!pegawai) return null;
  // Semakan skop — Ketua Unit hanya pegawai sektor sendiri.
  if (!scope.allSectors && pegawai.sektorId !== scope.sektorId) return null;

  const conditions = [eq(pergerakan.userId, pegawaiId), eq(pergerakan.aktif, true)];
  if (year) {
    conditions.push(gte(pergerakan.tarikhPergi, new Date(`${year}-01-01T00:00:00+08:00`)));
    conditions.push(lte(pergerakan.tarikhPergi, new Date(`${year}-12-31T23:59:59+08:00`)));
  }

  const rows = await withDbTimeout(
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
        oprStatus: opr.status,
      })
      .from(pergerakan)
      .leftJoin(sektors, eq(sektors.id, pergerakan.sektorId))
      .leftJoin(opr, eq(opr.pergerakanId, pergerakan.id))
      .where(and(...conditions))
      .orderBy(desc(pergerakan.tarikhPergi)),
  );

  const items: JejakItem[] = rows.map((r) => ({
    id: r.id,
    jenis: r.jenis,
    urusan: r.urusan,
    lokasi: r.lokasi,
    sektorCode: r.sektorCode,
    sektorName: r.sektorName,
    tarikhPergi: new Date(r.tarikhPergi),
    tarikhKembali: new Date(r.tarikhKembali),
    oprStatus: normalizeOprStatus(r.oprStatus),
  }));

  const summary: JejakSummary = {
    total: items.length,
    pergerakan: 0,
    bercuti: 0,
    oprSiap: 0,
    oprDraf: 0,
    oprTiada: 0,
    oprPerluTindakan: 0,
  };
  for (const it of items) {
    if (it.jenis === "Bercuti") summary.bercuti += 1;
    else summary.pergerakan += 1;
    if (it.oprStatus === "SIAP") summary.oprSiap += 1;
    else if (it.oprStatus === "DRAFT") summary.oprDraf += 1;
    else if (it.oprStatus === "TIADA") summary.oprTiada += 1;
    // Pergerakan tanpa OPR siap/tiada = perlu tindakan (draf atau belum jana).
    if (it.jenis === "Pergerakan" && it.oprStatus !== "SIAP" && it.oprStatus !== "TIADA") {
      summary.oprPerluTindakan += 1;
    }
  }

  return {
    pegawai: {
      id: pegawai.id,
      nama: pegawai.nama,
      jawatan: pegawai.jawatan,
      sektorCode: pegawai.sektorCode,
      sektorName: pegawai.sektorName,
    },
    items,
    summary,
  };
}
