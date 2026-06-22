import assert from "node:assert/strict";
import test from "node:test";
import {
  canAddTakwim,
  canModifyTakwimItem,
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

test("canAddTakwim is open to every logged-in role (sektor scope enforced separately)", () => {
  for (const peranan of ["Admin", "Penyelia", "Timbalan_PPD", "Ketua_Unit", "Pengguna"]) {
    assert.equal(canAddTakwim(peranan), true);
  }
});

const TAMBAHAN_OWN = { kategori: "tambahan" as const, sektorId: 9, createdByUserId: 100 };
const TAMBAHAN_OTHER_SEKTOR = { kategori: "tambahan" as const, sektorId: 3, createdByUserId: 200 };
const RANCANGAN_OWN_SEKTOR = { kategori: "rancangan" as const, sektorId: 5, createdByUserId: 200 };
const RANCANGAN_OTHER_SEKTOR = { kategori: "rancangan" as const, sektorId: 3, createdByUserId: 200 };

test("anyone can modify the tambahan they created", () => {
  const pengguna = { peranan: "Pengguna", id: 100, sektorId: 9 };
  assert.equal(canModifyTakwimItem(pengguna, TAMBAHAN_OWN), true);
  // ...but not someone else's tambahan
  assert.equal(canModifyTakwimItem(pengguna, TAMBAHAN_OTHER_SEKTOR), false);
});

test("Ketua Unit manages only its own sektor (tambahan and rancangan)", () => {
  const ketua = { peranan: "Ketua_Unit", id: 1, sektorId: 5 };
  assert.equal(canModifyTakwimItem(ketua, RANCANGAN_OWN_SEKTOR), true);
  assert.equal(canModifyTakwimItem(ketua, RANCANGAN_OTHER_SEKTOR), false);
  assert.equal(canModifyTakwimItem(ketua, { ...TAMBAHAN_OTHER_SEKTOR, sektorId: 5 }), true);
  assert.equal(canModifyTakwimItem(ketua, TAMBAHAN_OTHER_SEKTOR), false);
});

test("Admin and Timbalan manage everything across all sektors", () => {
  for (const peranan of ["Admin", "Timbalan_PPD"]) {
    const u = { peranan, id: 1, sektorId: null };
    assert.equal(canModifyTakwimItem(u, RANCANGAN_OTHER_SEKTOR), true);
    assert.equal(canModifyTakwimItem(u, TAMBAHAN_OTHER_SEKTOR), true);
  }
});

test("Penyelia (pemantau) manages all tambahan but never rancangan", () => {
  const penyelia = { peranan: "Penyelia", id: 1, sektorId: null };
  assert.equal(canModifyTakwimItem(penyelia, TAMBAHAN_OTHER_SEKTOR), true);
  assert.equal(canModifyTakwimItem(penyelia, RANCANGAN_OTHER_SEKTOR), false);
});

test("Pengguna cannot touch rancangan at all", () => {
  const pengguna = { peranan: "Pengguna", id: 100, sektorId: 5 };
  assert.equal(canModifyTakwimItem(pengguna, RANCANGAN_OWN_SEKTOR), false);
});
