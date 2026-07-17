/** Saiz kertas A4 (mm). */
export const OPR_PRINT_PAGE_WIDTH_MM = 210;
export const OPR_PRINT_PAGE_HEIGHT_MM = 297;

/**
 * Jidar atas/bawah cetakan OPR (mm).
 * Kiri/kanan kekal 1" (lubang fail). 9mm memberi ~6mm tinggi tambahan vs 12mm.
 */
export const OPR_PRINT_MARGIN_Y_MM = 9;

/**
 * Had zoom minimum — jangan kecut lebih daripada ini; biar jadi 2 muka jika
 * kandungan benar-benar terlalu panjang (elak teks/imej jadi terlalu kecil).
 */
export const OPR_PRINT_ZOOM_MIN = 0.85;

/**
 * Skrin biasanya sedikit lebih tinggi daripada layout cetak sebenar
 * (spacing Tailwind vs @media print). Bahagi tinggi terukur dengan faktor ini
 * supaya zoom tidak agresif.
 */
export const OPR_PRINT_SCREEN_HEIGHT_FACTOR = 1.1;

/** Jika hampir muat (≥ ini), jangan zoom — elak ruang kosong di bawah. */
export const OPR_PRINT_ZOOM_DEADZONE = 0.97;

export function oprPrintPageCss(): string {
  return `@media print { @page { size: A4 portrait; margin: ${OPR_PRINT_MARGIN_Y_MM}mm 1in; } }`;
}
