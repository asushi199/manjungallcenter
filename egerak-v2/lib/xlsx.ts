import PizZip from "pizzip";
import type { CsvRow } from "@/lib/csv-parse";

/**
 * Penjana & pembaca XLSX minimal (inlineStr) tanpa kebergantungan berat.
 * Digunakan bersama oleh templat Rancangan Tahunan dan templat Pengguna.
 */

export type XlsxSheet = {
  name: string;
  rows: string[][];
  /** OOXML mentah ditambah selepas <sheetData> (cth. <dataValidations> untuk dropdown). */
  extraXml?: string;
};

export function colName(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sheetXml(rows: string[][], extraXml = ""): string {
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
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml}</sheetData>${extraXml}</worksheet>`;
}

/** Bina satu fail .xlsx daripada beberapa sheet (sheet pertama = sheet utama untuk dibaca semula). */
export function buildXlsxWorkbook(sheets: XlsxSheet[]): Buffer {
  const zip = new PizZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
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
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
      .map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join("")}</sheets></workbook>`,
  );
  zip.folder("xl")?.folder("_rels")?.file(
    "workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join("")}</Relationships>`,
  );

  const worksheets = zip.folder("xl")?.folder("worksheets");
  sheets.forEach((s, i) => {
    worksheets?.file(`sheet${i + 1}.xml`, sheetXml(s.rows, s.extraXml ?? ""));
  });

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}

/**
 * dataValidation jenis senarai (dropdown) untuk satu lajur.
 * `source` boleh rujukan julat (cth. `'Kod Sektor'!$A$2:$A$9`) atau senarai literal
 * dalam petikan (cth. `"Dewan Bestari,Bilik Budiman"`).
 */
export function dropdownValidation(columnLetter: string, source: string): string {
  return (
    `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="${columnLetter}2:${columnLetter}1000">` +
    `<formula1>${source}</formula1>` +
    `</dataValidation>`
  );
}

/** Bungkus satu/lebih dropdownValidation menjadi blok <dataValidations>. */
export function dataValidationsXml(validations: string[]): string {
  const list = validations.filter(Boolean);
  if (!list.length) return "";
  return `<dataValidations count="${list.length}">${list.join("")}</dataValidations>`;
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
    const parts = [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => xmlUnescape(m[1]));
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

/** Baca sheet pertama satu .xlsx menjadi senarai baris berkunci header. */
export function readWorkbookRows(input: Buffer | Uint8Array): {
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
