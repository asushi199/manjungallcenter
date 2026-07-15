import assert from "node:assert/strict";
import test from "node:test";
import { buildDayUrusanCadangan, type DayActivityRow } from "../lib/analisis/day-activity-templates";

const base = (over: Partial<DayActivityRow>): DayActivityRow => ({
  urusan: "Mesyuarat",
  lokasi: "SK Seri Manjung",
  tarikhPergi: new Date("2026-06-25T08:00:00+08:00"),
  tarikhKembali: new Date("2026-06-25T17:00:00+08:00"),
  ...over,
});

test("rows with near-identical urusan collapse into one entry with a count", () => {
  const out = buildDayUrusanCadangan([
    base({ urusan: "Bengkel Penataran Kurikulum Sekolah Rendah" }),
    base({ urusan: "Penataran Kurikulum Sekolah Rendah Peringkat Daerah" }),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].count, 2);
});

test("distinct urusan stay separate, ordered by count", () => {
  const out = buildDayUrusanCadangan([
    base({ urusan: "Lawatan Penandaarasan SMK Ayer Tawar" }),
    base({ urusan: "Taklimat SISPA" }),
    base({ urusan: "Taklimat SISPA" }),
  ]);
  assert.deepEqual(
    out.map((t) => [t.urusan, t.count]),
    [
      ["Taklimat SISPA", 2],
      ["Lawatan Penandaarasan SMK Ayer Tawar", 1],
    ],
  );
});

test("a group takes lokasi from its earliest row but keeps the longest urusan", () => {
  const out = buildDayUrusanCadangan([
    base({
      urusan: "Taklimat SISPA Peringkat Daerah Manjung",
      lokasi: "Dewan Bestari",
      tarikhPergi: new Date("2026-06-25T14:00:00+08:00"),
    }),
    base({
      urusan: "Taklimat SISPA Daerah",
      lokasi: "Bilik Budiman",
      tarikhPergi: new Date("2026-06-25T08:00:00+08:00"),
    }),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].lokasi, "Bilik Budiman");
  assert.equal(out[0].urusan, "Taklimat SISPA Peringkat Daerah Manjung");
});

test("rows without urusan are dropped", () => {
  const out = buildDayUrusanCadangan([base({ urusan: "  " }), base({ urusan: "Taklimat SISPA" })]);
  assert.deepEqual(
    out.map((t) => t.urusan),
    ["Taklimat SISPA"],
  );
});
