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
  dropdownValidation,
  readWorkbookRows,
} from "@/lib/xlsx";

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
  "Tarikh Tamat",
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
    getCell(row, ["Tarikh Mula", "tarikh_pergi", "tarikh pergi"]),
    getCell(row, ["Tarikh Tamat", "tarikh_kembali", "tarikh kembali"]),
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

/** dataValidation untuk lajur Sektor (rujuk sheet "Kod Sektor") + Tempah Bilik (senarai literal). */
function rancanganValidations(sektorCount: number): string {
  const validations: string[] = [];
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
        ["Mesyuarat Penyelarasan USTP", "2026-06-14", "2026-06-14", "USTP", "Bilik Budiman", ""],
        ["Lawatan Sekolah", "2026-06-15", "2026-06-15", "USTP", "", "SK Seri Manjung"],
      ],
    },
    {
      name: "Panduan",
      rows: [
        ["Panduan"],
        ["Isi satu baris untuk satu aktiviti rancangan tahunan."],
        ["Pilih Sektor dari senarai juntai-bawah (dropdown)."],
        ["Tempah Bilik: pilih Dewan Bestari / Bilik Budiman (dropdown) jika perlu bilik terurus."],
        ["Lokasi lain (bukan bilik terurus) → isi lajur Lokasi."],
        ["Tiada lajur pegawai — pegawai sendiri 'ambil' aktiviti di skrin Daftar Pergerakan."],
        ["Format tarikh disyorkan: 2026-06-14 atau 2026-06-14 08:00."],
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
