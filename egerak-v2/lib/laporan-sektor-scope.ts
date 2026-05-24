import { isPenyeliaOnlySektorCode } from "./sektors";

export function normalizeLaporanSektorIds(ids: unknown): number[] {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0))];
}

/** Sektor yang boleh dipilih untuk skop laporan Timbalan PPD (tiada Pegawai PPD). */
export function filterSektorsForLaporanScope<T extends { id: number; code: string }>(
  sektors: T[],
): T[] {
  return sektors.filter((s) => !isPenyeliaOnlySektorCode(s.code));
}

export function intersectSektorIds(requested: number[] | undefined, allowed: number[]): number[] {
  if (!allowed.length) return [];
  if (!requested?.length) return allowed;
  const set = new Set(allowed);
  return requested.filter((id) => set.has(id));
}
