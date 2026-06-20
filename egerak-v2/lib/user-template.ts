import {
  buildXlsxWorkbook,
  colName,
  dataValidationsXml,
  dropdownValidation,
} from "@/lib/xlsx";
import { JAWATAN_OPTIONS } from "@/lib/jawatan";

/** Pilihan peranan untuk dropdown (label mesra; mapPerananCsv kenal kesemuanya). */
const PERANAN_OPTIONS = ["Pengguna", "Ketua Unit", "Timbalan PPD", "Pegawai PPD", "Admin"] as const;

/** Header sama seperti templat CSV (huruf kecil) supaya konsisten dengan parseCsv. */
const USER_HEADERS = ["username", "nama", "jawatan", "sektor", "peranan"] as const;

function userValidations(sektorCount: number): string {
  const validations: string[] = [];
  const jawatanCol = colName(USER_HEADERS.indexOf("jawatan"));
  validations.push(dropdownValidation(jawatanCol, `"${JAWATAN_OPTIONS.join(",")}"`));
  if (sektorCount > 0) {
    const sektorCol = colName(USER_HEADERS.indexOf("sektor"));
    validations.push(dropdownValidation(sektorCol, `'Kod Sektor'!$A$2:$A$${sektorCount + 1}`));
  }
  const perananCol = colName(USER_HEADERS.indexOf("peranan"));
  validations.push(dropdownValidation(perananCol, `"${PERANAN_OPTIONS.join(",")}"`));
  return dataValidationsXml(validations);
}

export function buildUserTemplateWorkbook(
  sektors: Array<{ code: string; name: string }>,
): Buffer {
  return buildXlsxWorkbook([
    {
      name: "Pengguna",
      rows: [Array.from(USER_HEADERS)],
      extraXml: userValidations(sektors.length),
    },
    {
      name: "Contoh",
      rows: [
        Array.from(USER_HEADERS),
        ["900101011111", "Ahmad bin Ali", "Penolong PPD", "PEMBELAJARAN", "Pengguna"],
        ["850202022222", "Kamal bin Hassan", "Ketua Unit", "USTP", "Ketua Unit"],
      ],
    },
    {
      name: "Panduan",
      rows: [
        ["Panduan"],
        ["Username ialah No. Kad Pengenalan (IC) 12 digit tanpa tanda sempang; Nama wajib diisi."],
        ["Username sedia ada akan dikemas kini (kata laluan tidak ditukar)."],
        ["Akaun baharu guna kata laluan lalai (ditetapkan semasa import)."],
        ["Pilih Sektor & Peranan dari senarai juntai-bawah (dropdown)."],
        ["Peranan kosong = Pengguna."],
      ],
    },
    {
      name: "Kod Sektor",
      rows: [["Kod Sektor", "Nama Sektor"], ...sektors.map((s) => [s.code, s.name])],
    },
  ]);
}
