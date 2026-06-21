import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/(app)/admin/analisis-pergerakan/AnalisisPergerakanClient.tsx", "utf8");

test("fokus by sektor rows keep full sektor names while fokus chips stay compact", () => {
  assert.match(source, /const crossRows = bySektorFokus\.map\(\(s\) => \(\{\s*label:\s*s\.name,/s);
  assert.match(source, /label:\s*fokusShortLabel\(f\.fokus\)/);
});
