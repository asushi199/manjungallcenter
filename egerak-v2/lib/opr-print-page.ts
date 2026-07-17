/** Saiz kertas A4 (mm). */
export const OPR_PRINT_PAGE_WIDTH_MM = 210;
export const OPR_PRINT_PAGE_HEIGHT_MM = 297;

/**
 * Jidar atas/bawah cetakan OPR (mm).
 * Kiri/kanan kekal 1" (lubang fail). 9mm memberi ~6mm tinggi tambahan vs 12mm.
 */
export const OPR_PRINT_MARGIN_Y_MM = 9;

/** Had zoom minimum supaya teks masih boleh dibaca bila kandungan sangat panjang. */
export const OPR_PRINT_ZOOM_MIN = 0.68;

export function oprPrintPageCss(): string {
  return `@media print { @page { size: A4 portrait; margin: ${OPR_PRINT_MARGIN_Y_MM}mm 1in; } }`;
}
