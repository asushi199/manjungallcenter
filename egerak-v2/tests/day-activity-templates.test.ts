import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDayUrusanCadangan,
  rankCadanganBySektor,
  type DayActivityRow,
} from "../lib/analisis/day-activity-templates";

const base = (over: Partial<DayActivityRow>): DayActivityRow => ({
  urusan: "Mesyuarat",
  lokasi: "SK Seri Manjung",
  tarikhPergi: new Date("2026-06-25T08:00:00+08:00"),
  tarikhKembali: new Date("2026-06-25T17:00:00+08:00"),
  sektorId: 1,
  ...over,
});

test("template carries the sektorId of its group", () => {
  const out = buildDayUrusanCadangan([base({ urusan: "Mesyuarat Panitia", sektorId: 7 })]);
  assert.equal(out.length, 1);
  assert.equal(out[0].sektorId, 7);
});

test("rankCadanganBySektor puts own sektor first, preserves the rest", () => {
  const t = buildDayUrusanCadangan([
    base({ urusan: "Mesyuarat Panitia", sektorId: 2 }),
    base({ urusan: "Latihan Guru", sektorId: 5 }),
    base({ urusan: "Bengkel Kurikulum", sektorId: 5 }),
  ]);
  const ranked = rankCadanganBySektor(t, 5);
  assert.deepEqual(
    ranked.map((x) => x.sektorId),
    [5, 5, 2],
  );
});

test("rankCadanganBySektor with null ownSektorId keeps original order", () => {
  const t = buildDayUrusanCadangan([
    base({ urusan: "Mesyuarat Panitia", sektorId: 2 }),
    base({ urusan: "Latihan Guru", sektorId: 5 }),
  ]);
  assert.deepEqual(rankCadanganBySektor(t, null), t);
});
