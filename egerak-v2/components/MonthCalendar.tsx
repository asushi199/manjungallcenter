"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { cn } from "@/lib/cn";
import { buildDayBuckets } from "@/lib/calendar-buckets";
import { sektorStyle } from "@/lib/sektor-colors";
import { replaceWithSearchParams } from "@/lib/navigate";

export type CalendarItem = {
  id: number;
  nama: string;
  jawatan: string;
  sektorCode: string | null;
  sektorName: string | null;
  jenis: "Pergerakan" | "Bercuti";
  urusan: string;
  lokasi: string;
  tarikhPergi: string;
  tarikhKembali: string;
};

const DAY_LABELS = ["Isn", "Sel", "Rab", "Kha", "Jum", "Sab", "Aha"];

/** Bilangan aktiviti dipapar dalam sel; selebihnya: "+N lagi" + klik untuk laci */
const MAX_IN_CELL = 4;

function ymdKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export default function MonthCalendar({
  month,
  items,
  highlightDate,
}: {
  month: string;
  items: CalendarItem[];
  /** Tarikh dipilih di penapis (garis biru pada sel) */
  highlightDate?: string;
}) {
  const [y, m] = month.split("-").map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const gridStart = startOfWeek(startOfMonth(firstOfMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(firstOfMonth), { weekStartsOn: 1 });

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
  const [openDay, setOpenDay] = useState<string | null>(null);
  /** Sorotan hari — setempat (klik sel), tanpa reload pelayan */
  const [selectedDay, setSelectedDay] = useState<string | undefined>(highlightDate);
  const router = useRouter();
  const urlParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedDay(highlightDate);
  }, [highlightDate]);

  function pushDashboardParams(patch: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(urlParams?.toString());
    patch(next);
    startTransition(() => {
      replaceWithSearchParams(router, "/dashboard", next);
    });
  }

  function applyMonth(newMonth: string) {
    pushDashboardParams((next) => {
      next.set("month", newMonth);
      const cur = highlightDate ?? ymdKey(new Date());
      if (!cur.startsWith(newMonth)) {
        const today = ymdKey(new Date());
        next.set("date", today.startsWith(newMonth) ? today : `${newMonth}-01`);
      }
    });
  }

  function shiftMonth(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    applyMonth(newMonth);
  }

  /** Klik hari: laci sebelah (data bulan ini sudah dimuat) — tiada panggilan DB. */
  function onDayClick(dayKey: string) {
    setSelectedDay(dayKey);
    setOpenDay(dayKey);
  }

  function openDayDrawer(dayKey: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    onDayClick(dayKey);
  }

  const monthTitle = format(firstOfMonth, "MMMM yyyy");

  return (
    <div
      className={cn("card overflow-hidden relative", isPending && "opacity-70 pointer-events-none")}
      aria-busy={isPending}
    >
      {isPending && (
        <p className="absolute top-2 right-2 z-10 text-xs font-medium text-brand-700 bg-white/90 px-2 py-1 rounded shadow-sm">
          Memuatkan…
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50 px-3 py-2">
        <p className="text-sm font-semibold text-slate-800">{monthTitle}</p>
        <div className="flex items-center gap-1.5">
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
            className="input py-1.5 text-sm w-[9.5rem]"
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
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 bg-slate-50 border-b">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {gridDays.map((d) => {
          const key = ymdKey(d);
          const inMonth = isSameMonth(d, firstOfMonth);
          const today = isToday(d);
          const selected = selectedDay === key;
          const dayItems = buckets.get(key) ?? [];
          const shown = dayItems.slice(0, MAX_IN_CELL);
          const more = dayItems.length - shown.length;
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => onDayClick(key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onDayClick(key);
                }
              }}
              className={cn(
                "text-left min-h-[100px] border-b border-r p-1 align-top hover:bg-slate-50/80 transition cursor-pointer",
                !inMonth && "bg-slate-50/50 text-slate-400",
                selected && "ring-2 ring-inset ring-brand-500 bg-brand-50/30",
              )}
            >
              <div className="flex items-center justify-between px-0.5">
                <span
                  className={cn(
                    "text-xs font-semibold",
                    today &&
                      "inline-flex w-6 h-6 items-center justify-center rounded-full bg-brand-600 text-white",
                  )}
                >
                  {format(d, "d")}
                </span>
                {dayItems.length > 0 && (
                  <span className="text-[10px] font-medium text-slate-600">{dayItems.length}</span>
                )}
              </div>
              <div className="mt-0.5 space-y-0.5">
                {shown.map((it) => {
                  const st = sektorStyle(it.sektorCode, it.jenis);
                  return (
                    <div
                      key={it.id}
                      className="truncate rounded-sm px-1 py-0.5 text-[10px] font-medium border-l-[3px]"
                      style={{
                        backgroundColor: st.bg,
                        color: st.text,
                        borderLeftColor: st.border,
                      }}
                      title={`${it.urusan}${it.sektorName ? ` · ${it.sektorName}` : ""}`}
                    >
                      {it.jenis === "Bercuti" ? "[Cuti] " : ""}
                      {it.urusan}
                    </div>
                  );
                })}
                {more > 0 && (
                  <button
                    type="button"
                    className="text-[10px] font-semibold pl-1 text-left w-full hover:underline"
                    style={{ color: "#b81049" }}
                    onClick={(e) => openDayDrawer(key, e)}
                  >
                    +{more} lagi · senarai
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {openDay && (
        <DayDrawer
          day={openDay}
          items={buckets.get(openDay) ?? []}
          onClose={() => setOpenDay(null)}
        />
      )}
    </div>
  );
}

function DayDrawer({
  day,
  items,
  onClose,
}: {
  day: string;
  items: CalendarItem[];
  onClose: () => void;
}) {
  const hasPergerakan = items.length > 0;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full sm:max-w-md bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Pergerakan</div>
            <div className="font-semibold">{format(new Date(day), "EEEE, dd MMM yyyy")}</div>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Tutup
          </button>
        </div>

        {hasPergerakan ? (
          <>
            <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pergerakan berdaftar ({items.length})
            </p>
            <ul className="divide-y border-t">
              {items.map((it) => {
                const st = sektorStyle(it.sektorCode, it.jenis);
                return (
                  <li key={it.id} className="px-4 py-3 border-l-4" style={{ borderLeftColor: st.border }}>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: st.chip }}
                      />
                      <span className="font-medium">{it.nama}</span>
                      {it.jenis === "Bercuti" && (
                        <span className="badge bg-emerald-100 text-emerald-700">Bercuti</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{it.jawatan}</div>
                    <div className="text-xs text-slate-500">
                      {it.sektorName ?? "(Sektor tidak ditetapkan)"}
                    </div>
                    <p className="mt-1 text-sm">{it.urusan}</p>
                    <div className="mt-1 text-xs text-slate-600">
                      <div>Lokasi: {it.lokasi || "-"}</div>
                      <div>
                        {format(new Date(it.tarikhPergi), "dd-MM-yyyy HH:mm")} sehingga{" "}
                        {format(new Date(it.tarikhKembali), "dd-MM-yyyy HH:mm")}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="p-6 text-sm text-slate-500">
            Tiada rekod pergerakan pada tarikh ini.
          </p>
        )}
      </aside>
    </div>
  );
}
