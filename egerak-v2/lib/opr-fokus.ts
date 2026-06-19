/**
 * Fokus OPR — klasifikasi jenis pelaksanaan program / aktiviti.
 * Medan wajib pada borang OPR (tidak disuap ke prompt AI); digunakan untuk
 * analisis di halaman Analisis OPR.
 */
export const OPR_FOKUS_OPTIONS = [
  "Bimbingan",
  "Aduan/Siasatan",
  "Perasmian",
  "Runding Cara/Konsultansi",
  "Pemantauan",
  "Program Sokongan",
] as const;

export type OprFokus = (typeof OPR_FOKUS_OPTIONS)[number];

export function isOprFokus(value: unknown): value is OprFokus {
  return (
    typeof value === "string" &&
    (OPR_FOKUS_OPTIONS as readonly string[]).includes(value)
  );
}
