import assert from "node:assert/strict";
import test from "node:test";
import PizZip from "pizzip";
import {
  buildRancanganTemplateWorkbook,
  normalizeRancanganImportRow,
  readRancanganWorkbookRows,
} from "../lib/rancangan-import";

test("normalizeRancanganImportRow accepts the simplified Excel headers (no owner column)", () => {
  const row = normalizeRancanganImportRow({
    Aktiviti: "mesyuarat penyelarasan",
    "Tarikh Mula": "2026-06-14",
    "Masa Mula": "",
    "Tarikh Tamat": "2026-06-14",
    "Masa Tamat": "",
    Sektor: "USTP",
    Lokasi: "Dewan Bestari",
  });

  assert.equal(row.ok, true);
  if (!row.ok) return;
  assert.equal(row.data.urusan, "Mesyuarat Penyelarasan");
  assert.equal(row.data.sektorCode, "USTP");
  assert.equal(row.data.fullDay, true);
  assert.equal(row.data.tarikhPergi.toISOString(), "2026-06-14T00:00:00.000Z");
  assert.equal(row.data.tarikhKembali.toISOString(), "2026-06-14T09:00:00.000Z");
});

test("normalizeRancanganImportRow accepts separate date and time columns", () => {
  const row = normalizeRancanganImportRow({
    Aktiviti: "taklimat sistem",
    "Tarikh Mula": "2026-06-14",
    "Masa Mula": "08:30",
    "Tarikh Tamat": "2026-06-14",
    "Masa Tamat": "12:00",
    Sektor: "USTP",
  });

  assert.equal(row.ok, true);
  if (!row.ok) return;
  assert.equal(row.data.tarikhPergi.toISOString(), "2026-06-14T00:30:00.000Z");
  assert.equal(row.data.tarikhKembali.toISOString(), "2026-06-14T04:00:00.000Z");
  assert.equal(row.data.fullDay, false);
});

test("normalizeRancanganImportRow keeps old lowercase CSV aliases compatible", () => {
  const row = normalizeRancanganImportRow({
    urusan: "taklimat sistem",
    tarikh_pergi: "2026-06-14 08:30",
    tarikh_kembali: "2026-06-14 12:00",
    sektor: "ustp",
  });

  assert.equal(row.ok, true);
  if (!row.ok) return;
  assert.equal(row.data.urusan, "Taklimat Sistem");
  assert.equal(row.data.sektorCode, "USTP");
  assert.equal(row.data.fullDay, false);
});

test("normalizeRancanganImportRow uses Tempah Bilik as lokasi when set", () => {
  const row = normalizeRancanganImportRow({
    Aktiviti: "Bengkel ICT",
    "Tarikh Mula": "2026-06-14",
    "Tarikh Tamat": "2026-06-14",
    Sektor: "USTP",
    "Tempah Bilik": "Bilik Budiman",
    Lokasi: "Blok A",
  });

  assert.equal(row.ok, true);
  if (!row.ok) return;
  // Bilik terurus diutamakan sebagai lokasi (pemicu tempahan bilik).
  assert.equal(row.data.lokasi, "Bilik Budiman");
});

test("normalizeRancanganImportRow falls back to Lokasi when Tempah Bilik kosong", () => {
  const row = normalizeRancanganImportRow({
    Aktiviti: "Lawatan",
    "Tarikh Mula": "2026-06-14",
    "Tarikh Tamat": "2026-06-14",
    Sektor: "USTP",
    "Tempah Bilik": "",
    Lokasi: "SK Seri Manjung",
  });

  assert.equal(row.ok, true);
  if (!row.ok) return;
  assert.equal(row.data.lokasi, "SK Seri Manjung");
});

test("normalizeRancanganImportRow rejects cuti rows for rancangan import", () => {
  const row = normalizeRancanganImportRow({
    urusan: "Cuti tahunan",
    jenis: "Bercuti",
    tarikh_pergi: "2026-06-14",
    tarikh_kembali: "2026-06-14",
    sektor: "USTP",
  });

  assert.equal(row.ok, false);
  if (row.ok) return;
  assert.match(row.error, /Cuti/i);
});

test("rancangan xlsx template has four sheets and can be read back from Rancangan rows", () => {
  const workbook = buildRancanganTemplateWorkbook([
    { code: "USTP", name: "Unit Sumber Teknologi Pendidikan" },
    { code: "PEMBELAJARAN", name: "Sektor Pembelajaran" },
  ]);
  const rows = readRancanganWorkbookRows(workbook);

  assert.deepEqual(rows.sheetNames, ["Rancangan", "Contoh", "Panduan", "Kod Sektor"]);
  assert.deepEqual(rows.rows, []);
});

test("rancangan xlsx template separates dates and time dropdowns", () => {
  const workbook = buildRancanganTemplateWorkbook([
    { code: "USTP", name: "Unit Sumber Teknologi Pendidikan" },
  ]);
  const zip = new PizZip(workbook);
  const sheetXml = zip.file("xl/worksheets/sheet1.xml")?.asText() ?? "";

  assert.match(sheetXml, /<c r="B1"[^>]*>[\s\S]*<t>Tarikh Mula<\/t>/);
  assert.match(sheetXml, /<c r="C1"[^>]*>[\s\S]*<t>Masa Mula<\/t>/);
  assert.match(sheetXml, /<c r="D1"[^>]*>[\s\S]*<t>Tarikh Tamat<\/t>/);
  assert.match(sheetXml, /<c r="E1"[^>]*>[\s\S]*<t>Masa Tamat<\/t>/);
  assert.match(sheetXml, /<dataValidation type="date"[^>]*sqref="B2:B1000">/);
  assert.match(sheetXml, /<dataValidation type="date"[^>]*sqref="D2:D1000">/);
  assert.match(sheetXml, /<dataValidation type="list"[^>]*sqref="C2:C1000">/);
  assert.match(sheetXml, /<dataValidation type="list"[^>]*sqref="E2:E1000">/);
  assert.match(sheetXml, /08:00,08:30/);
  assert.match(sheetXml, /17:00/);
});

test("readRancanganWorkbookRows reads shared strings and Excel serial dates", () => {
  const zip = new PizZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
  );
  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  );
  zip.folder("xl")?.file(
    "workbook.xml",
    `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Rancangan" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  );
  zip.folder("xl")?.folder("_rels")?.file(
    "workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
  );
  zip.folder("xl")?.file(
    "sharedStrings.xml",
    `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Aktiviti</t></si><si><t>Tarikh Mula</t></si><si><t>Tarikh Tamat</t></si><si><t>Sektor</t></si><si><t>Lokasi</t></si><si><t>Pegawai Bertanggungjawab</t></si><si><t>Mesyuarat Kurikulum</t></si><si><t>USTP</t></si><si><t>Bilik Budiman</t></si></sst>`,
  );
  zip.folder("xl")?.folder("worksheets")?.file(
    "sheet1.xml",
    `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c><c r="E1" t="s"><v>4</v></c><c r="F1" t="s"><v>5</v></c></row><row r="2"><c r="A2" t="s"><v>6</v></c><c r="B2"><v>46184</v></c><c r="C2"><v>46184.7083333333</v></c><c r="D2" t="s"><v>7</v></c><c r="E2" t="s"><v>8</v></c></row></sheetData></worksheet>`,
  );

  const workbook = zip.generate({ type: "nodebuffer" });
  const rows = readRancanganWorkbookRows(workbook);

  assert.deepEqual(rows.rows, [
    {
      Aktiviti: "Mesyuarat Kurikulum",
      "Tarikh Mula": "2026-06-11",
      "Tarikh Tamat": "2026-06-11 17:00",
      Sektor: "USTP",
      Lokasi: "Bilik Budiman",
      "Pegawai Bertanggungjawab": "",
    },
  ]);
});
