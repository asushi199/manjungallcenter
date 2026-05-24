import type { CalendarHolidays } from "./index";
import type { HolidayDetail } from "./types";

/** Boleh dihantar dari Server Component ke Client Component (bukan Map). */
export type SerializedCalendarHolidays = {
  publicLabels: Record<string, string>;
  publicDetails: Record<string, HolidayDetail>;
  schoolLabels: Record<string, string>;
  schoolDetails: Record<string, HolidayDetail>;
};

export function serializeCalendarHolidays(h: CalendarHolidays): SerializedCalendarHolidays {
  return {
    publicLabels: Object.fromEntries(h.publicLabels),
    publicDetails: Object.fromEntries(h.publicDetails),
    schoolLabels: Object.fromEntries(h.schoolLabels),
    schoolDetails: Object.fromEntries(h.schoolDetails),
  };
}
