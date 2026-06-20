import assert from "node:assert/strict";
import test from "node:test";
import {
  csvDateUsesAmbiguousSlashFormat,
  mapJenis,
  mapPerananCsv,
  normalizeSektorCode,
  parseCsv,
  parseCsvDateRange,
  parseSektorCodeList,
  resolveDayMonth,
  resolveUsername,
  isStrictIcUsername,
} from "../lib/csv-parse";

test("parseCsv supports quoted commas and skips commented email rows", () => {
  const rows = parseCsv('email,nama,urusan\nuser@example.com,"Ali, Abu",Mesyuarat\n#skip,x,y\n');

  assert.deepEqual(rows, [
    { email: "user@example.com", nama: "Ali, Abu", urusan: "Mesyuarat" },
  ]);
});

test("parseCsvDateRange applies default start and end times for date-only input", () => {
  const range = parseCsvDateRange("2026-06-14", "2026-06-15");

  assert.ok(range);
  assert.equal(range.pergi.toISOString(), "2026-06-14T00:00:00.000Z");
  assert.equal(range.kembali.toISOString(), "2026-06-15T09:00:00.000Z");
  assert.equal(range.fullDay, true);
});

test("parseCsvDateRange handles Excel-style month/day input when day is over 12", () => {
  const range = parseCsvDateRange("6/14/2026", "6/14/2026 15:30");

  assert.ok(range);
  assert.equal(range.pergi.toISOString(), "2026-06-14T00:00:00.000Z");
  assert.equal(range.kembali.toISOString(), "2026-06-14T07:30:00.000Z");
  assert.equal(range.fullDay, false);
});

test("CSV mapping helpers normalize common admin input", () => {
  assert.equal(csvDateUsesAmbiguousSlashFormat("6/14/2026"), true);
  assert.deepEqual(resolveDayMonth(14, 6), { dd: 14, mm: 6 });
  assert.equal(normalizeSektorCode(" Sektor (USTP) "), "SEKTOR_USTP");
  assert.deepEqual(parseSektorCodeList("ustp; spb"), ["USTP", "SPB"]);
  assert.equal(resolveUsername({ username: "880101081234" }), "880101081234");
  assert.equal(resolveUsername({ username: "880101-08-1234" }), "");
  assert.equal(resolveUsername({ email: "pegawai@example.com" }), "");
  assert.equal(mapJenis("Cuti Rehat"), "Bercuti");
  assert.equal(mapJenis("Mesyuarat"), "Pergerakan");
  assert.equal(mapPerananCsv("ketua unit"), "Ketua_Unit");
  assert.equal(mapPerananCsv("Pegawai PPD"), "Penyelia");
});

test("IC username must be exactly 12 digits without dash", () => {
  assert.equal(isStrictIcUsername("880101081234"), true);
  assert.equal(isStrictIcUsername("880101-08-1234"), false);
  assert.equal(isStrictIcUsername("88010108123"), false);
  assert.equal(isStrictIcUsername("pegawai"), false);
});
