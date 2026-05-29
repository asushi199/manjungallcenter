/** Kunci input AI: Maklumat tambahan + Sasaran + Nota pegawai (mentah). */
export function buildOprGenerateKey(
  maklumatTambahan: string,
  sasaran: string,
  notaPegawai: string,
): string {
  return `${maklumatTambahan.trim()}|${sasaran.trim()}|${notaPegawai.trim()}`;
}
