import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";

/** Julat yyyy-MM-dd grid kalendar (termasuk hari bulan lain). */
export function monthCalendarGridRange(month: string): { fromYmd: string; toYmd: string } {
  const [y, m] = month.split("-").map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const gridStart = startOfWeek(startOfMonth(firstOfMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(firstOfMonth), { weekStartsOn: 1 });
  return {
    fromYmd: format(gridStart, "yyyy-MM-dd"),
    toYmd: format(gridEnd, "yyyy-MM-dd"),
  };
}

export function yearsTouchingRange(fromYmd: string, toYmd: string): number[] {
  const y1 = Number(fromYmd.slice(0, 4));
  const y2 = Number(toYmd.slice(0, 4));
  const years: number[] = [];
  for (let y = y1; y <= y2; y++) years.push(y);
  return years;
}
