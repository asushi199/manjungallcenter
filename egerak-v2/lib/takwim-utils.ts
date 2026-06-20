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

export function canAddTakwim(peranan: UserPeranan | string | null | undefined): boolean {
  return peranan === "Admin" || peranan === "Ketua_Unit" || peranan === "Timbalan_PPD";
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

export function groupTakwimItemsByDate<T extends TakwimGroupItem>(
  items: T[],
): Array<{ dateKey: string; items: T[] }> {
  const sorted = [...items].sort((a, b) => {
    const dateA = new Date(a.tarikhPergi).getTime();
    const dateB = new Date(b.tarikhPergi).getTime();
    if (dateA !== dateB) return dateA - dateB;
    if (a.source !== b.source) return a.source === "bulk" ? -1 : 1;
    return a.id - b.id;
  });

  const groups = new Map<string, T[]>();
  for (const item of sorted) {
    const key = ymd(item.tarikhPergi);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  return [...groups.entries()].map(([dateKey, groupItems]) => ({
    dateKey,
    items: groupItems.sort((a, b) => {
      if (a.source !== b.source) return a.source === "bulk" ? -1 : 1;
      const dateA = new Date(a.tarikhPergi).getTime();
      const dateB = new Date(b.tarikhPergi).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.id - b.id;
    }),
  }));
}
