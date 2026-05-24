/**
 * Semak / cetak cuti umum (auto) dan cuti sekolah (manual) untuk tahun tertentu.
 *
 *   npx tsx scripts/sync-holidays.ts 2026
 *
 * Cuti umum: date-holidays (Perak). Cuti sekolah: edit lib/holidays/school-holidays-data.ts
 */
import Holidays from "date-holidays";
import { SCHOOL_HOLIDAY_RANGES } from "../lib/holidays/school-holidays-data";
import { expandHolidayRanges } from "../lib/holidays/expand-ranges";

const year = Number(process.argv[2] ?? new Date().getFullYear());

async function main() {
  const hd = new Holidays("MY", "08");
  const publicList = hd.getHolidays(year).filter((h) => h.type === "public" || h.type === "bank");

  console.log(`\n=== Cuti umum Perak ${year} (${publicList.length} hari, date-holidays) ===\n`);
  for (const h of publicList) {
    console.log(h.date.slice(0, 10), "—", h.name);
  }

  const school = expandHolidayRanges(
    SCHOOL_HOLIDAY_RANGES,
    "sekolah",
    { fromYmd: `${year}-01-01`, toYmd: `${year}-12-31` },
  );
  console.log(`\n=== Cuti sekolah KPM ${year} (${school.size} hari dalam julat data) ===\n`);
  const sorted = [...school.keys()].sort();
  let lastName = "";
  for (const d of sorted) {
    const detail = school.get(d)!;
    if (detail.name !== lastName) {
      console.log(`\n${detail.name}:`);
      lastName = detail.name;
    }
    process.stdout.write(`  ${d}`);
  }
  console.log("\n\nKemas kini cuti sekolah: lib/holidays/school-holidays-data.ts");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
