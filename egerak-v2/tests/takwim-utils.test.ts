import assert from "node:assert/strict";
import test from "node:test";
import {
  canAddTakwim,
  compactTakwimTimeLabel,
  groupTakwimItemsByDate,
  groupTakwimItemsByWeek,
  normalizeTakwimSearchTerm,
  normalizeTakwimMonth,
  parseTakwimSektorParam,
  serializeTakwimSektorParam,
  takwimDisplayKind,
} from "../lib/takwim-utils";

test("normalizeTakwimMonth accepts YYYY-MM and falls back for invalid input", () => {
  assert.equal(normalizeTakwimMonth("2026-05", "2026-06"), "2026-05");
  assert.equal(normalizeTakwimMonth("2026-5", "2026-06"), "2026-06");
  assert.equal(normalizeTakwimMonth(undefined, "2026-06"), "2026-06");
});

test("parseTakwimSektorParam defaults to own sector and supports explicit all", () => {
  assert.deepEqual(parseTakwimSektorParam(undefined, 7), [7]);
  assert.deepEqual(parseTakwimSektorParam(undefined, null), []);
  assert.equal(parseTakwimSektorParam("all", 7), "all");
  assert.deepEqual(parseTakwimSektorParam("1,2,abc,2,-1", 7), [1, 2]);
});

test("serializeTakwimSektorParam uses all for an empty selection", () => {
  assert.equal(serializeTakwimSektorParam([]), "all");
  assert.equal(serializeTakwimSektorParam([3, 1, 3]), "1,3");
});

test("normalizeTakwimSearchTerm trims and collapses whitespace", () => {
  assert.equal(normalizeTakwimSearchTerm("  mesyuarat   pengurusan  "), "mesyuarat pengurusan");
  assert.equal(normalizeTakwimSearchTerm("   "), "");
});

test("groupTakwimItemsByDate groups by Kuala Lumpur calendar date and sorts agenda items", () => {
  const groups = groupTakwimItemsByDate([
    { id: 2, source: "web", tarikhPergi: "2026-05-11T01:00:00.000Z" },
    { id: 1, source: "bulk", tarikhPergi: "2026-05-10T16:30:00.000Z" },
    { id: 3, source: "bulk", tarikhPergi: "2026-05-09T16:00:00.000Z" },
  ]);

  assert.deepEqual(groups.map((g) => g.dateKey), ["2026-05-10", "2026-05-11"]);
  assert.deepEqual(
    groups.map((g) => g.items.map((it) => it.id)),
    [[3], [1, 2]],
  );
});

test("groupTakwimItemsByWeek groups by calendar weeks within the selected month", () => {
  const groups = groupTakwimItemsByWeek("2026-05", [
    { id: 3, source: "web", tarikhPergi: "2026-05-04T01:00:00.000Z" },
    { id: 2, source: "bulk", tarikhPergi: "2026-05-02T01:00:00.000Z" },
    { id: 1, source: "bulk", tarikhPergi: "2026-05-01T01:00:00.000Z" },
  ]);

  assert.deepEqual(
    groups.map((g) => ({
      weekKey: g.weekKey,
      label: g.label,
      startDateKey: g.startDateKey,
      endDateKey: g.endDateKey,
      itemCount: g.itemCount,
      dateKeys: g.days.map((d) => d.dateKey),
    })),
    [
      {
        weekKey: "2026-05-W1",
        label: "M1",
        startDateKey: "2026-05-01",
        endDateKey: "2026-05-03",
        itemCount: 2,
        dateKeys: ["2026-05-01", "2026-05-02"],
      },
      {
        weekKey: "2026-05-W2",
        label: "M2",
        startDateKey: "2026-05-04",
        endDateKey: "2026-05-10",
        itemCount: 1,
        dateKeys: ["2026-05-04"],
      },
    ],
  );
});

test("groupTakwimItemsByWeek caps the last week at month end", () => {
  const groups = groupTakwimItemsByWeek("2026-08", [
    { id: 1, source: "bulk", tarikhPergi: "2026-08-31T01:00:00.000Z" },
  ]);

  assert.equal(groups[0]?.label, "M6");
  assert.equal(groups[0]?.startDateKey, "2026-08-31");
  assert.equal(groups[0]?.endDateKey, "2026-08-31");
});

test("groupTakwimItemsByWeek keeps overlapping cross-month items in the selected month", () => {
  const groups = groupTakwimItemsByWeek("2026-05", [
    {
      id: 1,
      source: "bulk",
      tarikhPergi: "2026-04-30T01:00:00.000Z",
      tarikhKembali: "2026-05-02T01:00:00.000Z",
    },
  ]);

  assert.equal(groups[0]?.label, "M1");
  assert.deepEqual(groups[0]?.days.map((day) => day.dateKey), ["2026-05-01"]);
  assert.deepEqual(groups[0]?.days[0]?.items.map((item) => item.id), [1]);
});

test("takwimDisplayKind separates rancangan, tambahan, lain-lain, and cuti", () => {
  assert.equal(
    takwimDisplayKind({ source: "bulk", takwimKategori: null, jenis: "Pergerakan" }),
    "rancangan",
  );
  assert.equal(
    takwimDisplayKind({ source: "web", takwimKategori: "tambahan", jenis: "Pergerakan" }),
    "tambahan",
  );
  assert.equal(
    takwimDisplayKind({ source: "web", takwimKategori: null, jenis: "Pergerakan" }),
    "lain",
  );
  assert.equal(
    takwimDisplayKind({ source: "bulk", takwimKategori: null, jenis: "Bercuti" }),
    null,
  );
});

test("compactTakwimTimeLabel keeps useful time without showing full details", () => {
  assert.equal(
    compactTakwimTimeLabel("2026-05-27T00:30:00.000Z", "2026-05-27T04:30:00.000Z"),
    "08:30",
  );
  assert.equal(
    compactTakwimTimeLabel("2026-05-27T00:00:00.000Z", "2026-05-27T15:59:00.000Z"),
    "Sepanjang hari",
  );
  assert.equal(
    compactTakwimTimeLabel("2026-05-27T08:00:00.000Z", "2026-05-28T04:00:00.000Z"),
    "2 hari",
  );
});

test("canAddTakwim allows only Admin, Ketua Unit, and Timbalan PPD", () => {
  assert.equal(canAddTakwim("Admin"), true);
  assert.equal(canAddTakwim("Ketua_Unit"), true);
  assert.equal(canAddTakwim("Timbalan_PPD"), true);
  assert.equal(canAddTakwim("Penyelia"), false);
  assert.equal(canAddTakwim("Pengguna"), false);
});
