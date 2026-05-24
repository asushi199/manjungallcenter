/**
 * Jana data cuti umum Perak ke fail TypeScript statik.
 *   npx tsx scripts/generate-public-holidays.ts
 *
 * Output: lib/holidays/public-holidays-data.ts
 *
 * Jalankan setiap awal tahun (atau apabila ada perubahan cuti Perak)
 * dan commit fail yang dijana. Ini elak `date-holidays` (~10MB) masuk
 * dalam bundle runtime Vercel.
 */
import Holidays from "date-holidays";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

/** Tahun semasa + 2 tahun ke depan (cukup untuk navigasi pengguna). */
const NOW_YEAR = new Date().getFullYear();
const YEARS = [NOW_YEAR - 1, NOW_YEAR, NOW_YEAR + 1, NOW_YEAR + 2];

const hd = new Holidays("MY", "08"); // 08 = Perak

type Row = { date: string; name: string };
const rows: Row[] = [];

for (const year of YEARS) {
  const list = hd.getHolidays(year);
  for (const h of list) {
    if (h.type !== "public" && h.type !== "bank") continue;
    rows.push({
      date: h.date.slice(0, 10),
      name: h.name.replace(/ \(.*\)$/, ""),
    });
  }
}

rows.sort((a, b) => a.date.localeCompare(b.date));

const fileContent = `/**
 * AUTO-GENERATED oleh scripts/generate-public-holidays.ts
 * JANGAN edit secara manual. Jalankan semula skrip untuk kemas kini:
 *   npx tsx scripts/generate-public-holidays.ts
 *
 * Tahun diliputi: ${YEARS.join(", ")}
 * Sumber: date-holidays (MY/Perak) — dijana ${new Date().toISOString().slice(0, 10)}
 */

export type PublicHolidayRow = {
  date: string;
  name: string;
};

export const PERAK_PUBLIC_HOLIDAYS: readonly PublicHolidayRow[] = ${JSON.stringify(rows, null, 2)};
`;

const outPath = join(process.cwd(), "lib", "holidays", "public-holidays-data.ts");
writeFileSync(outPath, fileContent, "utf8");

console.log(`Wrote ${rows.length} holidays for ${YEARS.length} years to ${outPath}`);
