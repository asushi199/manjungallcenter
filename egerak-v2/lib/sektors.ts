import type { UserPeranan } from "./roles";

export const SEKTOR_SEED: Array<{ code: string; name: string }> = [
  { code: "PERANCANGAN", name: "Sektor Perancangan" },
  { code: "PENGURUSAN_SEKOLAH", name: "Sektor Pengurusan Sekolah" },
  { code: "PEMBANGUNAN_MURID", name: "Sektor Pembangunan Murid" },
  { code: "PENTAKSIRAN", name: "Sektor Pentaksiran dan Peperiksaan" },
  { code: "PSIKOLOGI_KAUNSELING", name: "Sektor Psikologi dan Kaunseling" },
  { code: "PENGURUSAN", name: "Sektor Pengurusan" },
  { code: "USTP", name: "Unit Sumber Teknologi Pendidikan (USTP)" },
  { code: "PEMBELAJARAN", name: "Sektor Pembelajaran" },
  /** Hanya akaun peranan Penyelia (contoh: Ketua PPD / pentadbiran). */
  { code: "PPD_PENTADBIRAN", name: "Pegawai PPD" },
];

/** Kod sektor yang hanya boleh dikaitkan dengan peranan Penyelia. */
export const PENYELIA_ONLY_SEKTOR_CODES = ["PPD_PENTADBIRAN"] as const;

export function isPenyeliaOnlySektorCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return (PENYELIA_ONLY_SEKTOR_CODES as readonly string[]).includes(code);
}

export function filterSektorsForPeranan<T extends { code: string }>(
  sektors: T[],
  peranan: UserPeranan | string,
): T[] {
  if (peranan === "Penyelia") return sektors;
  return sektors.filter((s) => !isPenyeliaOnlySektorCode(s.code));
}
