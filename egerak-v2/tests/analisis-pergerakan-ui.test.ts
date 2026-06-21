import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/(app)/admin/analisis-pergerakan/AnalisisPergerakanClient.tsx", "utf8");
const pageSource = readFileSync("app/(app)/admin/analisis-pergerakan/page.tsx", "utf8");

test("fokus by sektor rows keep full sektor names while fokus chips stay compact", () => {
  assert.match(source, /const crossRows = bySektorFokus\.map\(\(s\) => \(\{\s*label:\s*s\.name,/s);
  assert.match(source, /label:\s*fokusShortLabel\(f\.fokus\)/);
});

test("analysis page avoids exposing calculation and chart mechanics in helper copy", () => {
  const combined = `${pageSource}\n${source}`;
  [
    "Pilih tab",
    "satu rekod satu kiraan",
    "bar bertindan",
    "satu garisan setiap",
    "Carta bulanan",
    "Tiada penggabungan",
    "override OPR",
    "sektor pendaftaran rekod",
    "sektor penghantar OPR siap",
    "Satu OPR siap = satu program",
  ].forEach((text) => assert.doesNotMatch(combined, new RegExp(text)));
});
