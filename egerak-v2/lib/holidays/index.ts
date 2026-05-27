import { expandHolidayRanges, filterHolidayMapByYmdRange } from "./expand-ranges";
import { monthCalendarGridRange, yearsTouchingRange } from "./month-grid-range";
import { getPublicHolidaysForYears } from "./public-holidays-auto";
import { SCHOOL_HOLIDAY_RANGES } from "./school-holidays-data";
import type { HolidayDetail } from "./types";

export type { HolidayDetail, HolidayKind } from "./types";

export type CalendarHolidays = {
  publicLabels: Map<string, string>;
  publicDetails: Map<string, HolidayDetail>;
  schoolLabels: Map<string, string>;
  schoolDetails: Map<string, HolidayDetail>;
};

function toLabelMap(details: Map<string, HolidayDetail>): Map<string, string> {
  const labels = new Map<string, string>();
  for (const [d, detail] of details) labels.set(d, detail.name);
  return labels;
}

/** Cuti untuk grid kalendar bulan (termasuk hari luar bulan). */
export async function getCalendarHolidays(
  month: string,
  opts: { showSchoolHolidays: boolean; weekStartsOn?: 0 | 1 },
): Promise<CalendarHolidays> {
  const { fromYmd, toYmd } = monthCalendarGridRange(month, opts.weekStartsOn ?? 1);
  const years = yearsTouchingRange(fromYmd, toYmd);

  const publicFull = filterHolidayMapByYmdRange(
    await getPublicHolidaysForYears(years),
    fromYmd,
    toYmd,
  );

  let schoolFull = new Map<string, HolidayDetail>();
  if (opts.showSchoolHolidays) {
    schoolFull = expandHolidayRanges(SCHOOL_HOLIDAY_RANGES, "sekolah", {
      fromYmd,
      toYmd,
    });
  }

  return {
    publicLabels: toLabelMap(publicFull),
    publicDetails: publicFull,
    schoolLabels: toLabelMap(schoolFull),
    schoolDetails: schoolFull,
  };
}
