import type { HolidayDetail } from "./types";
import { PERAK_PUBLIC_HOLIDAYS } from "./public-holidays-data";

/**
 * Cuti umum Perak — data pra-jana (statik) supaya bundle runtime kecil
 * dan tiada cold-start cost dari `date-holidays` (~10MB).
 *
 * Jana semula setiap tahun:
 *   npx tsx scripts/generate-public-holidays.ts
 */

const PUBLIC_HOLIDAY_NOTE =
  "Cuti umum Perak — data pra-jana. Semak portal JPM jika ada perubahan.";

/** Bina peta sekali sahaja masa modul dimuatkan; selepas itu O(1) per query. */
const HOLIDAY_MAP_BY_YEAR: Map<number, Map<string, HolidayDetail>> = (() => {
  const byYear = new Map<number, Map<string, HolidayDetail>>();
  for (const row of PERAK_PUBLIC_HOLIDAYS) {
    const year = Number(row.date.slice(0, 4));
    let m = byYear.get(year);
    if (!m) {
      m = new Map<string, HolidayDetail>();
      byYear.set(year, m);
    }
    m.set(row.date, {
      kind: "umum",
      name: row.name,
      note: PUBLIC_HOLIDAY_NOTE,
    });
  }
  return byYear;
})();

export async function loadPublicHolidaysForYear(
  year: number,
): Promise<Map<string, HolidayDetail>> {
  return HOLIDAY_MAP_BY_YEAR.get(year) ?? new Map();
}

export async function getPublicHolidaysForYears(
  years: number[],
): Promise<Map<string, HolidayDetail>> {
  const unique = [...new Set(years)].sort();
  const merged = new Map<string, HolidayDetail>();
  for (const y of unique) {
    const m = HOLIDAY_MAP_BY_YEAR.get(y);
    if (!m) continue;
    for (const [k, v] of m) merged.set(k, v);
  }
  return merged;
}
