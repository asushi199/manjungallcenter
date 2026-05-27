"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { cn } from "@/lib/cn";
import { TZ } from "@/lib/dates";
import { buildDayBuckets } from "@/lib/calendar-buckets";
import type { HolidayDetail } from "@/lib/holidays/types";
import type { CalendarGridOrientation, CalendarWeekStartsOn } from "@/lib/actions/calendar-settings";
import { replaceWithSearchParams } from "@/lib/navigate";
import SektorFilterDropdown from "@/components/SektorFilterDropdown";
import type { SektorOption } from "@/components/FilterBar";
import type { CalendarItem } from "@/components/MonthCalendar";
import SelectedDayCards from "@/components/SelectedDayCards";

type DotKind = "myToday" | "myFuture" | "myPast" | "anyPergerakan" | "holidayOnly" | "none";

const DAY_LABELS_MON = ["Isn", "Sel", "Rab", "Kha", "Jum", "Sab", "Aha"];
const DAY_LABELS_SUN = ["Aha", "Isn", "Sel", "Rab", "Kha", "Jum", "Sab"];

function ymdKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function computeDotKind(opts: {
  day: string;
  todayYmd: string;
  hasMine: boolean;
  hasAnyPergerakan: boolean;
  hasAnyHoliday: boolean;
}): DotKind {
  const { day, todayYmd, hasMine, hasAnyPergerakan, hasAnyHoliday } = opts;

  // My status priority (confirmed)
  if (hasMine) {
    if (day === todayYmd) return "myToday";
    if (day > todayYmd) return "myFuture";
    return "myPast";
  }
  if (hasAnyPergerakan) return "anyPergerakan";
  if (hasAnyHoliday) return "holidayOnly";
  return "none";
}

export default function MonthWeekCalendar({
  month,
  items,
  highlightDate,
  weekStartsOn,
  gridOrientation, // kept for compatibility (not used in new UI)
  sektors,
  sektorIds,
  toolbarLeading,
  publicHolidays,
  publicHolidayDetails,
  schoolHolidays,
  schoolHolidayDetails,
  myRegisteredDays,
}: {
  month: string;
  items: CalendarItem[];
  highlightDate?: string;
  weekStartsOn?: CalendarWeekStartsOn;
  gridOrientation?: CalendarGridOrientation;
  sektors: SektorOption[];
  sektorIds: number[];
  toolbarLeading?: ReactNode;
  myRegisteredDays: string[];
  publicHolidays: Record<string, string>;
  publicHolidayDetails: Record<string, HolidayDetail>;
  schoolHolidays: Record<string, string>;
  schoolHolidayDetails: Record<string, HolidayDetail>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const effectiveWeekStartsOn: CalendarWeekStartsOn = weekStartsOn ?? "mon";
  const weekStartsOnValue = effectiveWeekStartsOn === "sun" ? 0 : 1;
  const dayLabels = effectiveWeekStartsOn === "sun" ? DAY_LABELS_SUN : DAY_LABELS_MON;

  const [y, m] = month.split("-").map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const gridStart = startOfWeek(startOfMonth(firstOfMonth), { weekStartsOn: weekStartsOnValue });
  const gridEnd = endOfWeek(endOfMonth(firstOfMonth), { weekStartsOn: weekStartsOnValue });

  const gridDays = useMemo(() => {
    const out: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [gridStart, gridEnd]);

  const buckets = useMemo(() => buildDayBuckets(items, gridDays), [items, gridDays]);
  const myDaysSet = useMemo(() => new Set(myRegisteredDays), [myRegisteredDays]);
  const todayYmd = useMemo(() => formatInTimeZone(new Date(), TZ, "yyyy-MM-dd"), []);

  const initialSelectedDay = useMemo(() => {
    const cur = highlightDate ?? todayYmd;
    if (cur.startsWith(month)) return cur;
    // fallback: keep within month
    return `${month}-01`;
  }, [highlightDate, month, todayYmd]);

  const [selectedDay, setSelectedDay] = useState<string>(initialSelectedDay);
  const [collapsed, setCollapsed] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const syncingUrlRef = useRef(false);

  // When the server changes month/date (URL), reset selected day for that view.
  useEffect(() => {
    setSelectedDay(initialSelectedDay);
  }, [initialSelectedDay]);

  // Optional: sync selected day into URL without triggering RSC reload.
  useEffect(() => {
    if (syncingUrlRef.current) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDay)) return;
    const next = new URLSearchParams(params?.toString());
    next.set("date", selectedDay);
    const qs = next.toString();
    syncingUrlRef.current = true;
    window.history.replaceState(null, "", `/dashboard?${qs}`);
    queueMicrotask(() => {
      syncingUrlRef.current = false;
    });
  }, [params, selectedDay]);

  const dotByDay = useMemo(() => {
    const out = new Map<string, DotKind>();
    for (const d of gridDays) {
      const day = ymdKey(d);
      const dayItems = buckets.get(day) ?? [];
      const hasAnyPergerakan = dayItems.length > 0;
      const hasAnyHoliday = Boolean(publicHolidays?.[day] || schoolHolidays?.[day]);
      const hasMine = myDaysSet.has(day);
      out.set(
        day,
        computeDotKind({ day, todayYmd, hasMine, hasAnyPergerakan, hasAnyHoliday }),
      );
    }
    return out;
  }, [buckets, gridDays, myDaysSet, publicHolidays, schoolHolidays, todayYmd]);

  const selectedWeekRange = useMemo(() => {
    const sel = new Date(`${selectedDay}T12:00:00`);
    const start = startOfWeek(sel, { weekStartsOn: weekStartsOnValue });
    const end = endOfWeek(sel, { weekStartsOn: weekStartsOnValue });
    const from = ymdKey(start);
    const to = ymdKey(end);
    return { from, to };
  }, [selectedDay, weekStartsOnValue]);

  const visibleDays = useMemo(() => {
    if (!collapsed) return gridDays;
    return gridDays.filter((d) => {
      const key = ymdKey(d);
      return key >= selectedWeekRange.from && key <= selectedWeekRange.to;
    });
  }, [collapsed, gridDays, selectedWeekRange.from, selectedWeekRange.to]);

  function patchDashboardParams(patch: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params?.toString());
    patch(next);
    startTransition(() => {
      replaceWithSearchParams(router, "/dashboard", next);
    });
  }

  function applyMonth(newMonth: string) {
    patchDashboardParams((next) => {
      next.set("month", newMonth);
      // Keep server-side default date consistent (but the UI selection is client state).
      const cur = selectedDay;
      const nextDate = cur.startsWith(newMonth) ? cur : `${newMonth}-01`;
      next.set("date", nextDate);
    });
  }

  function shiftMonth(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    applyMonth(newMonth);
  }

  function setSektorIds(nextIds: number[]) {
    patchDashboardParams((next) => {
      if (nextIds.length) next.set("sektor", nextIds.join(","));
      else next.delete("sektor");
    });
  }

  const selectedItems = buckets.get(selectedDay) ?? [];
  const selectedPublicHoliday = publicHolidayDetails?.[selectedDay];
  const selectedSchoolHoliday = schoolHolidayDetails?.[selectedDay];

  return (
    <section className="space-y-3">
      <div className="card overflow-hidden">
        <div className="border-b bg-slate-50 px-3 py-2.5">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              {toolbarLeading ? <div className="shrink-0">{toolbarLeading}</div> : null}
              <div className="shrink-0">
                <SektorFilterDropdown
                  sektors={sektors}
                  selectedIds={sektorIds}
                  onChange={setSektorIds}
                  disabled={isPending}
                  label="Saring sektor"
                  compact
                  triggerVariant="icon"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                className="btn-secondary px-2 py-1.5 text-sm"
                onClick={() => shiftMonth(-1)}
                disabled={isPending}
                aria-label="Bulan sebelumnya"
              >
                ‹
              </button>
              <input
                type="month"
                className="input py-1.5 text-sm w-[8.75rem] sm:w-[9.5rem]"
                value={month}
                disabled={isPending}
                onChange={(e) => e.target.value && applyMonth(e.target.value)}
                aria-label="Pilih bulan"
              />
              <button
                type="button"
                className="btn-secondary px-2 py-1.5 text-sm"
                onClick={() => shiftMonth(1)}
                disabled={isPending}
                aria-label="Bulan seterusnya"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-500 bg-white border-b border-slate-100">
          {dayLabels.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1 px-1 py-1">
          {visibleDays.map((d) => {
            const day = ymdKey(d);
            const inMonth = isSameMonth(d, firstOfMonth);
            const isToday = day === todayYmd;
            const isSelected = day === selectedDay;
            const dot = dotByDay.get(day) ?? "none";
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "relative min-h-11 bg-white rounded-lg flex flex-col items-center justify-center py-1.5 ring-1 ring-transparent",
                  !inMonth && "text-slate-300",
                  isSelected && "bg-slate-100 ring-slate-300",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:z-10",
                )}
                aria-current={isSelected ? "date" : undefined}
                aria-label={day}
              >
                <span
                  className={cn(
                    "text-base font-semibold leading-none",
                    isToday &&
                      "inline-flex w-8 h-8 items-center justify-center rounded-full ring-2 ring-brand-700 text-brand-700",
                  )}
                >
                  {format(d, "d")}
                </span>

                <div className="mt-1 h-3 flex items-center justify-center">
                  {dot === "none" ? null : dot === "holidayOnly" ? (
                    <span
                      className="inline-block w-3 h-[2px] rounded bg-yellow-300/80"
                      aria-label="Cuti"
                      title="Cuti"
                    />
                  ) : (
                    <span
                      className={cn(
                        "inline-block w-2 h-2 rounded-full",
                        dot === "myToday" && "bg-brand-700",
                        dot === "myFuture" && "bg-emerald-500",
                        dot === "myPast" && "bg-slate-400",
                        dot === "anyPergerakan" && "border-2 border-blue-500 bg-transparent",
                      )}
                      aria-label={dot}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="border-t bg-white py-1.5 flex items-center justify-center">
          <button
            type="button"
            className="h-6 w-16 rounded-full bg-slate-200 hover:bg-slate-300 transition"
            aria-label={collapsed ? "Buka paparan bulan" : "Tutup kepada paparan minggu"}
            onClick={() => setCollapsed((v) => !v)}
            onPointerDown={(e) => {
              dragStartY.current = e.clientY;
            }}
            onPointerUp={(e) => {
              const startY = dragStartY.current;
              dragStartY.current = null;
              if (startY == null) return;
              const delta = e.clientY - startY;
              if (delta <= -18) setCollapsed(true);
              else if (delta >= 18) setCollapsed(false);
            }}
          />
        </div>
      </div>

      <SelectedDayCards
        day={selectedDay}
        items={selectedItems}
        publicHoliday={selectedPublicHoliday}
        schoolHoliday={selectedSchoolHoliday}
      />
    </section>
  );
}

