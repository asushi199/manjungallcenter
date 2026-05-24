import { format, parseISO, startOfMonth, endOfMonth, addDays, isAfter, isBefore } from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

export const TZ = "Asia/Kuala_Lumpur";

export function nowInTz() {
  return toZonedTime(new Date(), TZ);
}

/** "yyyy-MM-dd" dalam zon waktu PPD */
export function ymd(date: Date | string) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatInTimeZone(d, TZ, "yyyy-MM-dd");
}

/** Format datetime-local <input> menjadi Date (anggap input dalam zon PPD). */
export function parseLocalInput(s: string): Date | null {
  if (!s) return null;
  // input format: 2026-05-24T08:30
  const naive = new Date(s);
  if (isNaN(naive.getTime())) return null;
  // treat as Kuala Lumpur wall-clock
  return fromZonedTime(s, TZ);
}

export function toLocalInput(d: Date): string {
  return formatInTimeZone(d, TZ, "yyyy-MM-dd'T'HH:mm");
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? parseISO(d) : d;
  return formatInTimeZone(date, TZ, "dd-MM-yyyy HH:mm");
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? parseISO(d) : d;
  return formatInTimeZone(date, TZ, "dd-MM-yyyy");
}

export function monthRange(d: Date) {
  return { start: startOfMonth(d), end: endOfMonth(d) };
}

export function overlapsDate(start: Date, end: Date, day: Date) {
  // day adalah "yyyy-MM-dd" wall clock; bina span 00:00 - 23:59:59 dalam PPD
  const dayStart = fromZonedTime(`${ymd(day)}T00:00:00`, TZ);
  const dayEnd = fromZonedTime(`${ymd(day)}T23:59:59`, TZ);
  return !isAfter(start, dayEnd) && !isBefore(end, dayStart);
}

export function daysBetween(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  let d = startOfMonth(start); // placeholder, replaced below
  d = new Date(start);
  const stop = new Date(end);
  while (!isAfter(d, stop)) {
    out.push(new Date(d));
    d = addDays(d, 1);
  }
  return out;
}

export { format };
