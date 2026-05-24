import { addDays, format } from "date-fns";

function ymdKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

/** Letak setiap item pada hari grid yang bertindih — O(jumlah hari aktiviti), bukan O(item × 42). */
export function buildDayBuckets<T extends { tarikhPergi: string; tarikhKembali: string }>(
  items: T[],
  gridDays: Date[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  if (!gridDays.length) return map;

  for (const d of gridDays) map.set(ymdKey(d), []);

  const gridStart = new Date(gridDays[0]);
  gridStart.setHours(0, 0, 0, 0);
  const gridEnd = new Date(gridDays[gridDays.length - 1]);
  gridEnd.setHours(23, 59, 59, 999);

  for (const it of items) {
    const start = new Date(it.tarikhPergi);
    const end = new Date(it.tarikhKembali);
    let d = new Date(start);
    d.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    if (endDay < gridStart || d > gridEnd) continue;

    if (d < gridStart) d = new Date(gridStart);

    while (d <= endDay && d <= gridEnd) {
      const key = ymdKey(d);
      const bucket = map.get(key);
      if (bucket) bucket.push(it);
      d = addDays(d, 1);
    }
  }

  return map;
}
