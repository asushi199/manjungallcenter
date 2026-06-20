import PizZip from "pizzip";
import {
  mapJenis,
  normalizeSektorCode,
  parseCsvDateRange,
  resolveUsername,
  type CsvRow,
} from "@/lib/csv-parse";
import { formatTitleCase } from "@/lib/format-display-text";

export type NormalizedRancanganRow = {
  urusan: string;
  lokasi: string;
  sektorCode: string;
  ownerUsername: string | null;
  tarikhPergi: Date;
  tarikhKembali: Date;
  fullDay: boolean;
};

export type NormalizeRancanganRowResult =
  | { ok: true; data: NormalizedRancanganRow }
  | { ok: false; error: string };

const RANCANGAN_HEADERS = [
  "Aktiviti",
  "Tarikh Mula",
  "Tarikh Tamat",
  "Sektor",
  "Lokasi",
  "Pegawai Bertanggungjawab",
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

function ownerUsername(rawOwner: string, row: CsvRow): string | null {
  const owner = rawOwner.trim().toLowerCase();
  if (owner.includes("@")) return owner.split("@")[0];
  if (owner) return owner;
  const legacy = resolveUsername(row);
  return legacy || null;
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

  return {
    ok: true,
    data: {
      urusan,
      lokasi: formatTitleCase(getCell(row, ["Lokasi", "lokasi"])),
      sektorCode,
      ownerUsername: ownerUsername(getCell(row, ["Pegawai Bertanggungjawab", "pemilik"]), row),
      tarikhPergi: range.pergi,
      tarikhKembali: range.kembali,
      fullDay: range.fullDay,
    },
  };
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colName(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function sheetXml(rows: string[][]): string {
  const rowXml = rows
    .map((row, rIdx) => {
      const cells = row
        .map((value, cIdx) => {
          const ref = `${colName(cIdx)}${rIdx + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rIdx + 1}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml}</sheetData></worksheet>`;
}

export function buildRancanganTemplateWorkbook(
  sektors: Array<{ code: string; name: string }>,
): Buffer {
  const zip = new PizZip();
  const sheetNames = ["Rancangan", "Contoh", "Panduan", "Kod Sektor"];

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetNames
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join("")}</Types>`,
  );
  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  );
  zip.folder("xl")?.file(
    "workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetNames
      .map((name, i) => `<sheet name="${name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join("")}</sheets></workbook>`,
  );
  zip.folder("xl")?.folder("_rels")?.file(
    "workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetNames
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join("")}</Relationships>`,
  );

  const worksheets = zip.folder("xl")?.folder("worksheets");
  worksheets?.file("sheet1.xml", sheetXml([Array.from(RANCANGAN_HEADERS)]));
  worksheets?.file(
    "sheet2.xml",
    sheetXml([
      Array.from(RANCANGAN_HEADERS),
      [
        "Mesyuarat Penyelarasan USTP",
        "2026-06-14",
        "2026-06-14",
        "USTP",
        "Bilik Budiman",
        "pegawai@moe-dl.edu.my",
      ],
    ]),
  );
  worksheets?.file(
    "sheet3.xml",
    sheetXml([
      ["Panduan"],
      ["Isi satu baris untuk satu aktiviti rancangan tahunan."],
      ["Pegawai Bertanggungjawab boleh dikosongkan."],
      ["Format tarikh disyorkan: 2026-06-14 atau 2026-06-14 08:00."],
    ]),
  );
  worksheets?.file(
    "sheet4.xml",
    sheetXml([["Kod Sektor", "Nama Sektor"], ...sektors.map((s) => [s.code, s.name])]),
  );

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}

function xmlUnescape(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)].map((match) => {
    const parts = [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) =>
      xmlUnescape(m[1]),
    );
    return parts.join("");
  });
}

function colIndexFromRef(ref: string): number {
  const letters = ref.match(/[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  let index = 0;
  for (const ch of letters) {
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  return index - 1;
}

function excelSerialDateToText(value: string): string {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial < 30_000 || serial > 80_000) return value;

  const ms = Math.round(serial * 86_400_000);
  const date = new Date(Date.UTC(1899, 11, 30) + ms);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const dateText = `${yyyy}-${mm}-${dd}`;
  return hh === "00" && min === "00" ? dateText : `${dateText} ${hh}:${min}`;
}

function cellText(cellXml: string, sharedStrings: string[]): string {
  const type = cellXml.match(/\st="([^"]+)"/)?.[1];
  if (type === "inlineStr") {
    const inlineText = cellXml.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "";
    return xmlUnescape(inlineText);
  }

  const raw = cellXml.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? "";
  if (type === "s") return sharedStrings[Number(raw)] ?? "";
  if (type === "str") return xmlUnescape(raw);
  return excelSerialDateToText(raw);
}

function rowsFromSheetXml(xml: string, sharedStrings: string[]): string[][] {
  const rows: string[][] = [];
  const rowMatches = xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g);
  for (const rowMatch of rowMatches) {
    const cells: string[] = [];
    const cellMatches = rowMatch[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g);
    for (const cellMatch of cellMatches) {
      const ref = cellMatch[1].match(/\sr="([^"]+)"/)?.[1] ?? "";
      const index = ref ? colIndexFromRef(ref) : cells.length;
      cells[index] = cellText(cellMatch[0], sharedStrings);
    }
    rows.push(cells.map((value) => value ?? ""));
  }
  return rows;
}

export function readRancanganWorkbookRows(input: Buffer | Uint8Array): {
  sheetNames: string[];
  rows: CsvRow[];
} {
  const zip = new PizZip(input);
  const workbook = zip.file("xl/workbook.xml")?.asText() ?? "";
  const sheetNames = [...workbook.matchAll(/<sheet[^>]*name="([^"]+)"/g)].map((m) => m[1]);
  const sharedStrings = parseSharedStrings(zip.file("xl/sharedStrings.xml")?.asText() ?? "");
  const sheet = zip.file("xl/worksheets/sheet1.xml")?.asText();
  if (!sheet) return { sheetNames, rows: [] };

  const rows = rowsFromSheetXml(sheet, sharedStrings);
  const headers = rows[0] ?? [];
  const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim()));
  return {
    sheetNames,
    rows: dataRows.map((row) => {
      const out: CsvRow = {};
      headers.forEach((header, index) => {
        out[header] = row[index] ?? "";
      });
      return out;
    }),
  };
}
