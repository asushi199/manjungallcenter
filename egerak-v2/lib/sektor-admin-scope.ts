import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import type { SessionUser } from "@/lib/rbac";
import { intersectSektorIds, normalizeLaporanSektorIds } from "@/lib/laporan-sektor-scope";
import { isFullAdmin } from "@/lib/roles";

export type SektorScope = {
  /** Admin / Penyelia — tiada had sektor. */
  allSectors: boolean;
  allowedIds: number[];
  noAccess: boolean;
};

export async function resolveUserSektorScope(user: SessionUser): Promise<SektorScope> {
  const peranan = user.peranan;

  if (isFullAdmin(peranan) || peranan === "Penyelia") {
    return { allSectors: true, allowedIds: [], noAccess: false };
  }

  if (peranan === "Ketua_Unit") {
    const sid = user.sektorId != null ? Number(user.sektorId) : null;
    if (!sid || !Number.isFinite(sid)) {
      return { allSectors: false, allowedIds: [], noAccess: true };
    }
    return { allSectors: false, allowedIds: [sid], noAccess: false };
  }

  if (peranan === "Timbalan_PPD") {
    const row = await db.query.users.findFirst({
      where: eq(users.id, Number(user.id)),
      columns: { laporanSektorIds: true },
    });
    const ids = normalizeLaporanSektorIds(row?.laporanSektorIds);
    if (!ids.length) {
      return { allSectors: false, allowedIds: [], noAccess: true };
    }
    return { allSectors: false, allowedIds: ids, noAccess: false };
  }

  return { allSectors: false, allowedIds: [], noAccess: true };
}

export function applySektorScopeToFilter(
  requestedIds: number[] | undefined,
  scope: SektorScope,
): number[] | undefined {
  if (scope.allSectors) {
    return requestedIds?.length ? requestedIds : undefined;
  }
  if (scope.noAccess) return [];
  return intersectSektorIds(requestedIds?.length ? requestedIds : undefined, scope.allowedIds);
}

export function isSektorIdInScope(sektorId: number | null | undefined, scope: SektorScope): boolean {
  if (scope.allSectors) return true;
  if (scope.noAccess || sektorId == null) return false;
  return scope.allowedIds.includes(sektorId);
}
