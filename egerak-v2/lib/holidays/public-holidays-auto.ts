import Holidays from "date-holidays";
import { unstable_cache } from "next/cache";
import type { HolidayDetail } from "./types";

/** Perak (kod negeri date-holidays: 08) */
const PERAK_STATE = "08";

function loadPublicHolidaysForYearUncached(year: number): Map<string, HolidayDetail> {
  const hd = new Holidays("MY", PERAK_STATE);
  const list = hd.getHolidays(year);
  const map = new Map<string, HolidayDetail>();

  for (const h of list) {
    if (h.type !== "public" && h.type !== "bank") continue;
    const ymd = h.date.slice(0, 10);
    map.set(ymd, {
      kind: "umum",
      name: h.name.replace(/ \(.*\)$/, ""),
      note: "Cuti umum Perak — dikemas kini automatik (date-holidays). Semak JPM jika ada perubahan.",
    });
  }

  return map;
}

async function loadPublicHolidaysForYear(year: number): Promise<Map<string, HolidayDetail>> {
  return unstable_cache(
    async () => loadPublicHolidaysForYearUncached(year),
    ["public-holidays-perak", String(year)],
    { revalidate: 60 * 60 * 24 * 7 },
  )();
}

export async function getPublicHolidaysForYears(
  years: number[],
): Promise<Map<string, HolidayDetail>> {
  const unique = [...new Set(years)].sort();
  const maps = await Promise.all(unique.map((y) => loadPublicHolidaysForYear(y)));
  const merged = new Map<string, HolidayDetail>();
  for (const m of maps) {
    for (const [k, v] of m) merged.set(k, v);
  }
  return merged;
}
