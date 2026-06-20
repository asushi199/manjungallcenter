import assert from "node:assert/strict";
import test from "node:test";
import { buildUserTemplateWorkbook } from "../lib/user-template";
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
