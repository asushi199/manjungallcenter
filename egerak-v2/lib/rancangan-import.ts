import {
  mapJenis,
  normalizeSektorCode,
  parseCsvDateRange,
  type CsvRow,
} from "@/lib/csv-parse";
import { formatTitleCase } from "@/lib/format-display-text";
import {
  buildXlsxWorkbook,
  colName,
  dataValidationsXml,
  dateValidation,
  dropdownValidation,
  readWorkbookRows,
} from "@/lib/xlsx";
import {
  DEFAULT_TIME_KEMBALI,
  DEFAULT_TIME_PERGI,
  TIME_OPTIONS_REGISTER,
} from "@/lib/datetime-picker";

export type NormalizedRancanganRow = {
  urusan: string;
  lokasi: string;
  sektorCode: string;
  tarikhPergi: Date;
  tarikhKembali: Date;
  fullDay: boolean;
};

export type NormalizeRancanganRowResult =
  | { ok: true; data: NormalizedRancanganRow }
  | { ok: false; error: string };

/** Bilik yang boleh ditempah (lajur "Tempah Bilik" — dropdown). */
const TEMPAH_BILIK_OPTIONS = ["Dewan Bestari", "Bilik Budiman"] as const;

const RANCANGAN_HEADERS = [
  "Aktiviti",
  "Tarikh Mula",
  "Masa Mula",
  "Tarikh Tamat",
  "Masa Tamat",
  "Sektor",
  "Tempah Bilik",
  "Lokasi",
] as const;

function keyOf(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function getCell(row: CsvRow, aliases: string[]): string {
  const normalized = new Map(Object.entries(row).map(([k, v]) => [keyOf(k), v]));
  for (const alias of aliases) {
    const value = normalized.get(keyOf(alias));
    if (value != null && value.trim()) return value.trim();
  }
  return "";
}

function dateTimeInput(row: CsvRow, dateAliases: string[], timeAliases: string[]): string {
  const dateRaw = getCell(row, dateAliases);
  if (!dateRaw) return "";
  const timeRaw = getCell(row, timeAliases);
  return timeRaw ? `${dateRaw} ${timeRaw}` : dateRaw;
}

export function normalizeRancanganImportRow(row: CsvRow): NormalizeRancanganRowResult {
  const jenisRaw = getCell(row, ["jenis"]);
  if (jenisRaw && mapJenis(jenisRaw) === "Bercuti") {
    return { ok: false, error: "Cuti tidak boleh diimport sebagai Rancangan Tahunan." };
  }

  const urusan = formatTitleCase(getCell(row, ["Aktiviti", "urusan"]));
  if (!urusan) return { ok: false, error: "Aktiviti diperlukan." };

  const sektorCode = normalizeSektorCode(getCell(row, ["Sektor", "kod sektor"]));
  if (!sektorCode) return { ok: false, error: "Sektor diperlukan." };

  const range = parseCsvDateRange(
    dateTimeInput(
      row,
      ["Tarikh Mula", "tarikh_pergi", "tarikh pergi"],
      ["Masa Mula", "masa_pergi", "masa pergi"],
    ),
    dateTimeInput(
      row,
      ["Tarikh Tamat", "tarikh_kembali", "tarikh kembali"],
      ["Masa Tamat", "masa_kembali", "masa kembali"],
    ),
  );
  if (!range) return { ok: false, error: "Tarikh mula/tamat tidak sah." };
  if (range.kembali.getTime() < range.pergi.getTime()) {
    return { ok: false, error: "Tarikh tamat mesti selepas tarikh mula." };
  }

  // "Tempah Bilik" (dropdown bilik terurus) diutamakan sebagai lokasi & pemicu tempahan.
  // Jika kosong, guna teks "Lokasi" biasa (tiada tempahan automatik).
  const bilik = getCell(row, ["Tempah Bilik", "bilik"]);
  const lokasiText = getCell(row, ["Lokasi", "lokasi"]);

  return {
    ok: true,
    data: {
      urusan,
      lokasi: formatTitleCase(bilik || lokasiText),
      sektorCode,
      tarikhPergi: range.pergi,
      tarikhKembali: range.kembali,
      fullDay: range.fullDay,
    },
  };
}

/** dataValidation untuk tarikh, masa, sektor dan Tempah Bilik. */
function rancanganValidations(sektorCount: number): string {
  const validations: string[] = [];
  const tarikhMulaCol = colName(RANCANGAN_HEADERS.indexOf("Tarikh Mula"));
  const masaMulaCol = colName(RANCANGAN_HEADERS.indexOf("Masa Mula"));
  const tarikhTamatCol = colName(RANCANGAN_HEADERS.indexOf("Tarikh Tamat"));
  const masaTamatCol = colName(RANCANGAN_HEADERS.indexOf("Masa Tamat"));
  validations.push(dateValidation(tarikhMulaCol));
  validations.push(dropdownValidation(masaMulaCol, `"${TIME_OPTIONS_REGISTER.join(",")}"`));
  validations.push(dateValidation(tarikhTamatCol));
  validations.push(dropdownValidation(masaTamatCol, `"${TIME_OPTIONS_REGISTER.join(",")}"`));
  if (sektorCount > 0) {
    const sektorCol = colName(RANCANGAN_HEADERS.indexOf("Sektor"));
    validations.push(dropdownValidation(sektorCol, `'Kod Sektor'!$A$2:$A$${sektorCount + 1}`));
  }
  const bilikCol = colName(RANCANGAN_HEADERS.indexOf("Tempah Bilik"));
  validations.push(dropdownValidation(bilikCol, `"${TEMPAH_BILIK_OPTIONS.join(",")}"`));
  return dataValidationsXml(validations);
}

export function buildRancanganTemplateWorkbook(
  sektors: Array<{ code: string; name: string }>,
): Buffer {
  return buildXlsxWorkbook([
    {
      name: "Rancangan",
      rows: [Array.from(RANCANGAN_HEADERS)],
      extraXml: rancanganValidations(sektors.length),
    },
    {
      name: "Contoh",
      rows: [
        Array.from(RANCANGAN_HEADERS),
        [
          "Mesyuarat Penyelarasan USTP",
          "2026-06-14",
          DEFAULT_TIME_PERGI,
          "2026-06-14",
          DEFAULT_TIME_KEMBALI,
          "USTP",
          "Bilik Budiman",
          "",
        ],
        ["Lawatan Sekolah", "2026-06-15", "", "2026-06-15", "", "USTP", "", "SK Seri Manjung"],
      ],
    },
    {
      name: "Panduan",
      rows: [
        ["Panduan"],
        ["Isi satu baris untuk satu aktiviti rancangan tahunan."],
        ["Tarikh Mula dan Tarikh Tamat wajib diisi. WAJIB guna format TTTT-BB-HH (cth: 2026-06-14)."],
        [
          "Elak format 6/7/2026 - jika hari & bulan kedua-duanya 12 ke bawah, sistem mungkin keliru (6 Julai jadi 7 Jun). Guna 2026-07-06 untuk pasti.",
        ],
        [
          "Masa Mula dan Masa Tamat boleh dikosongkan. Jika kosong, sistem guna 08:00 hingga 17:00 dan dianggap aktiviti sepanjang hari.",
        ],
        ["Jika perlu masa khusus, pilih Masa Mula dan Masa Tamat dari dropdown."],
        ["Pilih Sektor dari senarai juntai-bawah (dropdown)."],
        ["Tempah Bilik: pilih Dewan Bestari / Bilik Budiman (dropdown) jika perlu bilik terurus."],
        ["Lokasi lain (bukan bilik terurus) → isi lajur Lokasi."],
        ["Tiada lajur pegawai — pegawai sendiri 'ambil' aktiviti di skrin Daftar Pergerakan."],
      ],
    },
    {
      name: "Kod Sektor",
      rows: [["Kod Sektor", "Nama Sektor"], ...sektors.map((s) => [s.code, s.name])],
    },
  ]);
}

/** @deprecated Guna readWorkbookRows. Dikekalkan untuk keserasian. */
export function readRancanganWorkbookRows(input: Buffer | Uint8Array): {
  sheetNames: string[];
  rows: CsvRow[];
} {
  return readWorkbookRows(input);
}
