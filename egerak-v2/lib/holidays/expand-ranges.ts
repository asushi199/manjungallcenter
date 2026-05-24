import { addDays, format, parseISO } from "date-fns";
import type { HolidayDetail, HolidayRange } from "./types";

function ymd(d: Date) {
  return format(d, "yyyy-MM-dd");
}

/** Kembangkan julat cuti sekolah kepada peta per hari. */
export function expandHolidayRanges(
  ranges: HolidayRange[],
  kind: HolidayDetail["kind"],
  opts?: { fromYmd?: string; toYmd?: string },
): Map<string, HolidayDetail> {
  const out = new Map<string, HolidayDetail>();
  for (const r of ranges) {
    let d = parseISO(r.start);
    const end = parseISO(r.end);
    while (d <= end) {
      const key = ymd(d);
      if (
        (!opts?.fromYmd || key >= opts.fromYmd) &&
        (!opts?.toYmd || key <= opts.toYmd)
      ) {
        out.set(key, {
          kind,
          name: r.name,
          note: r.note ?? `Julat: ${r.start} hingga ${r.end}`,
        });
      }
      d = addDays(d, 1);
    }
  }
  return out;
}

export function filterHolidayMapByYmdRange(
  map: Map<string, HolidayDetail>,
  fromYmd: string,
  toYmd: string,
): Map<string, HolidayDetail> {
  const out = new Map<string, HolidayDetail>();
  for (const [k, v] of map) {
    if (k >= fromYmd && k <= toYmd) out.set(k, v);
  }
  return out;
}

export function holidayMapsForMonth(
  full: Map<string, HolidayDetail>,
  month: string,
): { labels: Map<string, string>; details: Map<string, HolidayDetail> } {
  const prefix = `${month}-`;
  const labels = new Map<string, string>();
  const details = new Map<string, HolidayDetail>();
  for (const [date, detail] of full) {
    if (!date.startsWith(prefix)) continue;
    labels.set(date, detail.name);
    details.set(date, detail);
  }
  return { labels, details };
}
