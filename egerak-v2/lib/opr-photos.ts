/** Had gambar aktiviti setiap satu OPR */
export const OPR_MAX_PHOTOS = 4;

/** Metadata untuk susun atur & nama fail gambar OPR di storan. */
export type OprPhotoMeta = {
  /** id OPR — rujukan dalam nama fail */
  oprId: number;
  /** tarikh program — untuk folder Tahun / Bulan */
  tarikh: Date | string;
  /** kod sektor (cth. "USTP") — folder & nama fail */
  sektorCode: string;
  /** nama program / urusan — diringkaskan menjadi slug nama fail */
  program: string;
  /** nombor urutan gambar dalam OPR (1..n) */
  index?: number;
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function slugForName(value: string, maxLen: number): string {
  const slug = (value || "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, maxLen);
  return slug || "NA";
}

/**
 * Bina nama fail self-describing + laluan subfolder (Tahun / Bulan / Sektor).
 * Cth nama: 2026-06-19_USTP_OPR30_SIASATAN-SISPA_2_lqx3.jpg
 */
export function buildOprPhotoNaming(
  meta: OprPhotoMeta,
  originalName: string,
): { fileName: string; subPath: string[] } {
  const d = meta.tarikh instanceof Date ? meta.tarikh : new Date(meta.tarikh);
  const safeDate = Number.isNaN(d.getTime()) ? new Date() : d;
  const year = String(safeDate.getFullYear());
  const month = `${year}-${pad2(safeDate.getMonth() + 1)}`;
  const dateStr = `${month}-${pad2(safeDate.getDate())}`;
  const sektor = slugForName(meta.sektorCode, 12);
  const program = slugForName(meta.program, 28);
  const dot = originalName.lastIndexOf(".");
  const ext =
    (dot >= 0 ? originalName.slice(dot + 1) : "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 5) || "jpg";
  const idx = meta.index ? `_${meta.index}` : "";
  const unique = Date.now().toString(36);
  const fileName = `${dateStr}_${sektor}_OPR${meta.oprId}_${program}${idx}_${unique}.${ext}`;
  // Hierarki: Tahun / Bulan / Sektor
  const subPath = [year, month, sektor];
  return { fileName, subPath };
}

export const OPR_IMAGE_MAX_EDGE_PX = 1920;
export const OPR_IMAGE_JPEG_QUALITY = 0.82;
/** Sasaran saiz selepas mampatan (kurangkan beban GAS) */
export const OPR_IMAGE_TARGET_MAX_BYTES = 1_200_000;
/** Fail kecil tidak perlu dimampatkan semula */
export const OPR_IMAGE_SKIP_COMPRESS_BELOW_BYTES = 450_000;
