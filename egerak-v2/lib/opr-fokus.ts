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
  "Mesyuarat",
  "Latihan/Taklimat",
] as const;

export type OprFokus = (typeof OPR_FOKUS_OPTIONS)[number];

/**
 * Petunjuk contoh untuk fokus tertentu — dipaparkan dalam dropdown borang OPR
 * sahaja (nilai disimpan & analisis kekal nama penuh, tidak terjejas).
 */
export const OPR_FOKUS_HINTS: Partial<Record<OprFokus, string>> = {
  "Latihan/Taklimat": "taklimat, bengkel, ceramah, seminar",
};

export function isOprFokus(value: unknown): value is OprFokus {
  return (
    typeof value === "string" &&
    (OPR_FOKUS_OPTIONS as readonly string[]).includes(value)
  );
}
