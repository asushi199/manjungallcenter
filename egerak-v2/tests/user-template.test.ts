import assert from "node:assert/strict";
import test from "node:test";
import PizZip from "pizzip";
import { buildUserTemplateWorkbook } from "../lib/user-template";
import { SEKTOR_STYLE, SEKTOR_STYLE_DEFAULT } from "../lib/sektor-colors";
import { readWorkbookRows } from "../lib/xlsx";

test("user template has four sheets and an empty Pengguna sheet (header only)", () => {
  const workbook = buildUserTemplateWorkbook([
    { code: "USTP", name: "Unit Sumber Teknologi Pendidikan" },
    { code: "PEMBELAJARAN", name: "Sektor Pembelajaran" },
  ]);
  const out = readWorkbookRows(workbook);

  assert.deepEqual(out.sheetNames, ["Pengguna", "Contoh", "Panduan", "Kod Sektor"]);
  assert.deepEqual(out.rows, []);
});

test("user template locks the jawatan dropdown to official options", () => {
  const workbook = buildUserTemplateWorkbook([
    { code: "USTP", name: "Unit Sumber Teknologi Pendidikan" },
  ]);
  const zip = new PizZip(workbook);
  const sheetXml = zip.file("xl/worksheets/sheet1.xml")?.asText() ?? "";

  assert.match(
    sheetXml,
    /<dataValidation[^>]*showErrorMessage="1"[^>]*sqref="C2:C1000">/,
  );
});

test("Pegawai PPD sector uses a distinct non-default color", () => {
  const ppd = SEKTOR_STYLE.PPD_PENTADBIRAN;
  const neutralSlateColors = new Set(["#e2e8f0", "#475569", "#0f172a", "#94a3b8"]);

  assert.notDeepEqual(ppd, SEKTOR_STYLE_DEFAULT);
  assert.equal(
    [ppd.bg, ppd.border, ppd.text, ppd.chip].some((color) => neutralSlateColors.has(color)),
    false,
  );
});
