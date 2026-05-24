import Holidays from "date-holidays";
import type { HolidayDetail } from "./types";

/** Perak (kod negeri date-holidays: 08) */
const PERAK_STATE = "08";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const yearCache = new Map<number, { at: number; data: Map<string, HolidayDetail> }>();

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

export async function loadPublicHolidaysForYear(year: number): Promise<Map<string, HolidayDetail>> {
  const hit = yearCache.get(year);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  try {
    const data = loadPublicHolidaysForYearUncached(year);
    yearCache.set(year, { at: Date.now(), data });
    return data;
  } catch (e) {
    console.error("[holidays] date-holidays gagal untuk tahun", year, e);
    return new Map();
  }
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
