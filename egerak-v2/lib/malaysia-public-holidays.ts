/**
 * @deprecated Guna `lib/holidays` — cuti umum auto (date-holidays) + cuti sekolah.
 */
import type { HolidayDetail } from "./holidays/types";
import { getCalendarHolidays } from "./holidays";

export type PublicHolidayDetail = { name: string; note?: string };

export async function getPublicHolidayDetailsForMonth(
  month: string,
): Promise<Map<string, PublicHolidayDetail>> {
  const h = await getCalendarHolidays(month, { showSchoolHolidays: false });
  const out = new Map<string, PublicHolidayDetail>();
  for (const [d, detail] of h.publicDetails) {
    out.set(d, { name: detail.name, note: detail.note });
  }
  return out;
}

export async function getPublicHolidaysForMonth(month: string): Promise<Map<string, string>> {
  const h = await getCalendarHolidays(month, { showSchoolHolidays: false });
  return h.publicLabels;
}

export function getPublicHolidayName(_ymd: string): string | undefined {
  return undefined;
}

export function getPublicHolidayDetail(_ymd: string): PublicHolidayDetail | undefined {
  return undefined;
}
