import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/dates";

const DAY_BM = ["Aha", "Isn", "Sel", "Rab", "Kha", "Jum", "Sab"] as const;

export type MonthBookingCell = {
  title: string;
  pegawaiNama: string;
};

export type RoomBookingRow = {
  id: number;
  roomId: number;
  tarikh: string;
  slot: "AM" | "PM";
  title: string;
  pegawaiNama: string;
};

/** Lalai: bulan semasa (zon PPD). */
export function defaultMonthYm(): string {
  return formatInTimeZone(new Date(), TZ, "yyyy-MM");
}

export function parseMonthParam(raw: string | undefined): string {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
  return defaultMonthYm();
}

export function monthRange(monthYm: string): { start: string; end: string; days: string[] } {
  const [y, m] = monthYm.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const start = `${monthYm}-01`;
  const end = `${monthYm}-${String(lastDay).padStart(2, "0")}`;
  const days: string[] = [];
  for (let d = 1; d <= lastDay; d++) {
    days.push(`${monthYm}-${String(d).padStart(2, "0")}`);
  }
  return { start, end, days };
}

export function formatDayLabel(tarikh: string): string {
  const d = parseISO(tarikh);
  const dow = DAY_BM[d.getDay()];
  return `${dow}, ${format(d, "dd/MM/yyyy")}`;
}

/** Ringkas untuk cetak — muat satu halaman melintang. */
export function formatDayLabelCompact(tarikh: string): string {
  const d = parseISO(tarikh);
  return `${format(d, "dd/MM")} ${DAY_BM[d.getDay()]}`;
}

export function isWeekend(tarikh: string): boolean {
  const dow = parseISO(tarikh).getDay();
  return dow === 0 || dow === 6;
}

export function buildBookingLookup(
  bookings: RoomBookingRow[],
): Map<string, MonthBookingCell> {
  const map = new Map<string, MonthBookingCell>();
  for (const b of bookings) {
    map.set(`${b.roomId}|${b.tarikh}|${b.slot}`, {
      title: b.title,
      pegawaiNama: b.pegawaiNama,
    });
  }
  return map;
}

export function monthTitleBm(monthYm: string): string {
  const [y, m] = monthYm.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMMM yyyy");
}

/** Untuk pautan cetak dari minggu semasa pada /bilik. */
export function monthFromWeekStart(weekStart: string): string {
  return weekStart.slice(0, 7);
}
