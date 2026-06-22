import { formatInTimeZone } from "date-fns-tz";
import { TZ, ymd } from "@/lib/dates";
import type { UserPeranan } from "@/lib/roles";

export type TakwimSektorSelection = number[] | "all";
export type TakwimKategori = "tambahan" | null;
export type TakwimDisplayKind = "rancangan" | "tambahan" | "lain";

export type TakwimGroupItem = {
  id: number;
  source: "web" | "bulk";
  takwimKategori?: TakwimKategori;
  jenis?: "Pergerakan" | "Bercuti";
  tarikhPergi: string | Date;
  tarikhKembali?: string | Date;
};

export type TakwimDateGroup<T extends TakwimGroupItem> = {
  dateKey: string;
  items: T[];
};

export type TakwimWeekGroup<T extends TakwimGroupItem> = {
  weekKey: string;
  weekNumber: number;
  label: string;
  startDateKey: string;
  endDateKey: string;
  itemCount: number;
  days: TakwimDateGroup<T>[];
};

export function normalizeTakwimMonth(month: string | undefined, fallbackMonth: string): string {
  if (month && /^\d{4}-\d{2}$/.test(month)) return month;
  return fallbackMonth;
}

export function parseTakwimSektorParam(
  sektorParam: string | undefined,
  ownSektorId: number | null,
): TakwimSektorSelection {
  if (sektorParam === "all") return "all";
  if (!sektorParam) return ownSektorId ? [ownSektorId] : [];

  const ids = sektorParam
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0);

  return [...new Set(ids)];
}

export function serializeTakwimSektorParam(ids: number[]): string {
  const normalized = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))].sort(
    (a, b) => a - b,
  );
  return normalized.length ? normalized.join(",") : "all";
}

export function normalizeTakwimSearchTerm(search: string | undefined): string {
  return (search ?? "").trim().replace(/\s+/g, " ");
}

export type TakwimActorPeranan = UserPeranan | string | null | undefined;

/**
 * Semua pengguna log masuk boleh menambah takwim (tambahan).
 * Skop sektor sebenar (sektor sendiri vs semua) dikawal berasingan di server.
 */
export function canAddTakwim(_peranan: TakwimActorPeranan): boolean {
  return true;
}

export type TakwimModUser = {
  peranan: TakwimActorPeranan;
  id: number;
  sektorId: number | null;
};

export type TakwimModItem = {
  kategori: "rancangan" | "tambahan";
  sektorId: number | null;
  createdByUserId: number | null;
};

/**
 * Kebenaran edit/padam satu aktiviti takwim (jadual takwim_aktiviti).
 * - Tambahan: pencipta sendiri sentiasa boleh; selain itu ikut skop sektor.
 * - Admin/Penyelia/Timbalan: semua sektor, kedua-dua tambahan & rancangan.
 *   (Penyelia boleh edit/padam tetapi tiada kebenaran import rancangan.)
 * - Ketua Unit: sektor sendiri sahaja.
 *
 * Skop edit dan padam adalah sama.
 */
export function canModifyTakwimItem(user: TakwimModUser, item: TakwimModItem): boolean {
  if (
    item.kategori === "tambahan" &&
    item.createdByUserId != null &&
    item.createdByUserId === user.id
  ) {
    return true;
  }

  switch (user.peranan) {
    case "Admin":
    case "Penyelia":
    case "Timbalan_PPD":
      return true;
    case "Ketua_Unit":
      return user.sektorId != null && item.sektorId === user.sektorId;
    default:
      return false;
  }
}

export function takwimDisplayKind(item: {
  source: "web" | "bulk";
  takwimKategori?: TakwimKategori;
  jenis: "Pergerakan" | "Bercuti";
}): TakwimDisplayKind | null {
  if (item.jenis === "Bercuti") return null;
  if (item.source === "bulk") return "rancangan";
  if (item.takwimKategori === "tambahan") return "tambahan";
  return "lain";
}

export function isTakwimUtama(item: {
  source: "web" | "bulk";
  takwimKategori?: TakwimKategori;
  jenis: "Pergerakan" | "Bercuti";
}): boolean {
  const kind = takwimDisplayKind(item);
  return kind === "rancangan" || kind === "tambahan";
}

export function compactTakwimTimeLabel(startValue: string | Date, endValue: string | Date): string {
  const start = new Date(startValue);
  const end = new Date(endValue);
  const startDate = formatInTimeZone(start, TZ, "yyyy-MM-dd");
  const endDate = formatInTimeZone(end, TZ, "yyyy-MM-dd");

  if (startDate !== endDate) {
    const startDay = new Date(`${startDate}T00:00:00+08:00`);
    const endDay = new Date(`${endDate}T00:00:00+08:00`);
    const days = Math.max(
      2,
      Math.round((endDay.getTime() - startDay.getTime()) / 86_400_000) + 1,
    );
    return `${days} hari`;
  }

  const startTime = formatInTimeZone(start, TZ, "HH:mm");
  const endTime = formatInTimeZone(end, TZ, "HH:mm");
  if (startTime === "08:00" && (endTime === "17:00" || endTime === "23:59")) {
    return "Sepanjang hari";
  }

  return startTime;
}

function compareTakwimItems<T extends TakwimGroupItem>(a: T, b: T): number {
  const dateA = new Date(a.tarikhPergi).getTime();
  const dateB = new Date(b.tarikhPergi).getTime();
  if (dateA !== dateB) return dateA - dateB;
  if (a.source !== b.source) return a.source === "bulk" ? -1 : 1;
  return a.id - b.id;
}

export function groupTakwimItemsByDate<T extends TakwimGroupItem>(
  items: T[],
): TakwimDateGroup<T>[] {
  const sorted = [...items].sort(compareTakwimItems);

  const groups = new Map<string, T[]>();
  for (const item of sorted) {
    const key = ymd(item.tarikhPergi);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  return [...groups.entries()].map(([dateKey, groupItems]) => ({
    dateKey,
    items: groupItems.sort(compareTakwimItems),
  }));
}

function parseMonthParts(month: string): { year: number; monthIndex: number; lastDay: number } | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, monthNumber] = month.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return null;
  }

  return {
    year,
    monthIndex: monthNumber - 1,
    lastDay: new Date(Date.UTC(year, monthNumber, 0)).getUTCDate(),
  };
}

function dateKeyForDay(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, "0")}`;
}

function mondayBasedWeekday(year: number, monthIndex: number, day: number): number {
  const sundayBased = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
  return sundayBased === 0 ? 7 : sundayBased;
}

function weekRangeForDay(month: string, day: number): {
  weekNumber: number;
  startDateKey: string;
  endDateKey: string;
} | null {
  const parts = parseMonthParts(month);
  if (!parts || day < 1 || day > parts.lastDay) return null;

  let startDay = 1;
  let endDay = Math.min(parts.lastDay, 8 - mondayBasedWeekday(parts.year, parts.monthIndex, 1));
  let weekNumber = 1;

  while (day > endDay) {
    startDay = endDay + 1;
    endDay = Math.min(parts.lastDay, startDay + 6);
    weekNumber += 1;
  }

  return {
    weekNumber,
    startDateKey: dateKeyForDay(month, startDay),
    endDateKey: dateKeyForDay(month, endDay),
  };
}

function displayDateKeyForMonth<T extends TakwimGroupItem>(
  month: string,
  lastDay: number,
  item: T,
): string | null {
  const monthStart = dateKeyForDay(month, 1);
  const monthEnd = dateKeyForDay(month, lastDay);
  const startKey = ymd(item.tarikhPergi);
  const endKey = ymd(item.tarikhKembali ?? item.tarikhPergi);

  if (endKey < monthStart || startKey > monthEnd) return null;
  return startKey < monthStart ? monthStart : startKey;
}

function groupTakwimItemsByDisplayDateInMonth<T extends TakwimGroupItem>(
  month: string,
  lastDay: number,
  items: T[],
): TakwimDateGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of [...items].sort(compareTakwimItems)) {
    const key = displayDateKeyForMonth(month, lastDay, item);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, groupItems]) => ({
      dateKey,
      items: groupItems.sort(compareTakwimItems),
    }));
}

export function groupTakwimItemsByWeek<T extends TakwimGroupItem>(
  month: string,
  items: T[],
): TakwimWeekGroup<T>[] {
  const parts = parseMonthParts(month);
  if (!parts) return [];

  const dateGroups = groupTakwimItemsByDisplayDateInMonth(month, parts.lastDay, items);
  const weekGroups = new Map<number, TakwimWeekGroup<T>>();

  for (const dateGroup of dateGroups) {
    const day = Number(dateGroup.dateKey.slice(8, 10));
    const range = weekRangeForDay(month, day);
    if (!range) continue;

    const existing = weekGroups.get(range.weekNumber);
    if (existing) {
      existing.days.push(dateGroup);
      existing.itemCount += dateGroup.items.length;
      continue;
    }

    weekGroups.set(range.weekNumber, {
      weekKey: `${month}-W${range.weekNumber}`,
      weekNumber: range.weekNumber,
      label: `M${range.weekNumber}`,
      startDateKey: range.startDateKey,
      endDateKey: range.endDateKey,
      itemCount: dateGroup.items.length,
      days: [dateGroup],
    });
  }

  return [...weekGroups.values()].sort((a, b) => a.weekNumber - b.weekNumber);
}
