"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { deletePergerakanIds } from "@/lib/actions/pergerakan";
import PergerakanCard, { type PergerakanCardData } from "@/components/PergerakanCard";
import DatePickerButton from "@/components/DatePickerButton";
import {
  classifyOprTodo,
  countByOprCategory,
  formatMonthOprSummary,
  matchesOprFilter,
  type OprTodoFilter,
} from "@/lib/opr-todo";
import { cn } from "@/lib/cn";

type SortKey = "tarikh" | "urusan" | "lokasi" | "sektor" | "opr";

const OPR_SORT_RANK: Record<string, number> = {
  "": 0,
  DRAFT: 1,
  TIADA: 2,
  SIAP: 3,
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "tarikh", label: "Tarikh" },
  { key: "urusan", label: "Urusan" },
  { key: "lokasi", label: "Lokasi" },
  { key: "sektor", label: "Sektor" },
  { key: "opr", label: "Status OPR" },
];

const OPR_FILTERS: { key: OprTodoFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "perlu", label: "Perlu OPR" },
  { key: "draf", label: "Draf" },
  { key: "siap", label: "Siap" },
  { key: "tiada", label: "Tidak perlu" },
];

/** Warna bermakna bagi setiap status OPR (cip penapis). */
const OPR_FILTER_STYLE: Record<string, { active: string; idle: string }> = {
  all: {
    active: "bg-brand-600 text-white border-brand-600",
    idle: "bg-white text-slate-700 border-slate-200 hover:border-slate-300",
  },
  perlu: {
    active: "bg-red-600 text-white border-red-600",
    idle: "bg-red-100 text-red-700 border-red-300 hover:border-red-400",
  },
  draf: {
    active: "bg-amber-500 text-white border-amber-500",
    idle: "bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300",
  },
  siap: {
    active: "bg-emerald-600 text-white border-emerald-600",
    idle: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300",
  },
  tiada: {
    active: "bg-slate-600 text-white border-slate-600",
    idle: "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300",
  },
};

function compareItems(a: MyItem, b: MyItem, key: SortKey): number {
  switch (key) {
    case "urusan":
      return a.urusan.localeCompare(b.urusan, "ms") || a.jenis.localeCompare(b.jenis, "ms");
    case "lokasi":
      return (a.lokasi || "").localeCompare(b.lokasi || "", "ms");
    case "sektor":
      return (a.sektorName || "").localeCompare(b.sektorName || "", "ms");
    case "tarikh":
      return new Date(a.tarikhPergi).getTime() - new Date(b.tarikhPergi).getTime();
    case "opr": {
      const ra = OPR_SORT_RANK[a.oprStatus ?? ""] ?? 0;
      const rb = OPR_SORT_RANK[b.oprStatus ?? ""] ?? 0;
      return ra - rb || a.urusan.localeCompare(b.urusan, "ms");
    }
    default:
      return 0;
  }
}

type MyItem = PergerakanCardData & { id: number };

const CURRENT_YM = format(new Date(), "yyyy-MM");

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return format(d, "MMMM yyyy");
}

/** Bulan lalai: bulan semasa jika ada rekod, jika tidak bulan terkini yang lepas. */
function pickDefaultMonth(monthsDesc: string[], todayYm: string): string | null {
  if (monthsDesc.length === 0) return null;
  if (monthsDesc.includes(todayYm)) return todayYm;
  const recentPast = monthsDesc.find((m) => m <= todayYm);
  return recentPast ?? monthsDesc[monthsDesc.length - 1];
}

export default function MyClient({ items }: { items: MyItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [oprFilter, setOprFilter] = useState<OprTodoFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("tarikh");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const oprCounts = useMemo(() => countByOprCategory(items), [items]);
  const oprNeedTotal = oprCounts.perlu + oprCounts.draf + oprCounts.siap;
  const oprDonePct = oprNeedTotal ? Math.round((oprCounts.siap / oprNeedTotal) * 100) : 0;

  const isSearching = query.trim().length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const category = classifyOprTodo(it.jenis, it.oprStatus);
      if (!matchesOprFilter(category, oprFilter)) return false;
      if (!q) return true;
      return (
        it.urusan.toLowerCase().includes(q) ||
        it.lokasi.toLowerCase().includes(q) ||
        (it.sektorName ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, oprFilter]);

  const sortList = useMemo(() => {
    return (list: MyItem[]) => {
      const out = [...list];
      out.sort((a, b) => {
        const c = compareItems(a, b, sortKey);
        return sortDir === "asc" ? c : -c;
      });
      return out;
    };
  }, [sortKey, sortDir]);

  /** Carian: senarai rata merentas semua bulan. */
  const searchResults = useMemo(
    () => (isSearching ? sortList(filtered) : []),
    [isSearching, filtered, sortList],
  );

  /** Bulan yang mempunyai rekod (selepas penapis OPR), tersusun menurun. */
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const it of filtered) set.add(format(new Date(it.tarikhPergi), "yyyy-MM"));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [filtered]);

  const activeMonth = useMemo(() => {
    if (availableMonths.length === 0) return null;
    if (selectedMonth) return selectedMonth;
    return pickDefaultMonth(availableMonths, CURRENT_YM);
  }, [selectedMonth, availableMonths]);

  const monthItems = useMemo(() => {
    if (!activeMonth) return [];
    const list = filtered.filter(
      (it) => format(new Date(it.tarikhPergi), "yyyy-MM") === activeMonth,
    );
    return sortList(list);
  }, [filtered, activeMonth, sortList]);

  // Jiran bulan (yang ada rekod) untuk butang lepas/depan — melangkau bulan kosong.
  const olderMonth = activeMonth
    ? availableMonths.find((m) => m < activeMonth) ?? null
    : null;
  const newerMonth = activeMonth
    ? [...availableMonths].reverse().find((m) => m > activeMonth) ?? null
    : null;

  const monthSummaries = useMemo(() => {
    const map = new Map<string, string>();
    const byMonth = new Map<string, MyItem[]>();
    for (const it of items) {
      const ym = format(new Date(it.tarikhPergi), "yyyy-MM");
      const list = byMonth.get(ym) ?? [];
      list.push(it);
      byMonth.set(ym, list);
    }
    for (const [ym, list] of byMonth) {
      map.set(ym, formatMonthOprSummary(countByOprCategory(list)));
    }
    return map;
  }, [items]);

  const visibleItems = isSearching ? searchResults : monthItems;

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    const allSelected =
      visibleItems.length > 0 && visibleItems.every((i) => selected.has(i.id));
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(visibleItems.map((i) => i.id)));
  }

  function onDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Padam ${selected.size} rekod?`)) return;
    startTransition(async () => {
      const r = await deletePergerakanIds([...selected]);
      alert(`${r.deleted} rekod dipadam.`);
      setSelected(new Set());
      router.refresh();
    });
  }

  function renderCard(it: MyItem) {
    return (
      <PergerakanCard
        key={it.id}
        variant="mine"
        item={it}
        selected={selected.has(it.id)}
        onToggleSelect={() => toggle(it.id)}
      />
    );
  }

  const noMatch = (
    <div className="card p-8 text-center text-slate-500">
      <p>Tiada rekod sepadan dengan penapis.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="card p-3 space-y-3">
        {oprNeedTotal > 0 && (
          <div className="flex items-center gap-2.5">
            <span className="whitespace-nowrap text-xs text-slate-500">OPR siap</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${oprDonePct}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-xs font-medium tabular-nums text-slate-700">
              {oprCounts.siap} / {oprNeedTotal} · {oprDonePct}%
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {OPR_FILTERS.map((f) => {
            const count =
              f.key === "all"
                ? items.length
                : oprCounts[f.key as keyof typeof oprCounts] ?? 0;
            const style = OPR_FILTER_STYLE[f.key] ?? OPR_FILTER_STYLE.all;
            const isActive = oprFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setOprFilter(f.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  isActive ? style.active : style.idle,
                  !isActive && count === 0 && "opacity-50",
                )}
              >
                {f.label}
                <span className="ml-1 opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input flex-1 min-w-[200px]"
            placeholder="Carian urusan / lokasi / sektor..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <span className="whitespace-nowrap">Susun</span>
            <select
              className="input py-1.5 text-sm w-auto min-w-[7rem]"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className="input py-1.5 text-sm w-auto"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
              aria-label="Arah susunan"
            >
              <option value="desc">Terbaharu</option>
              <option value="asc">Terlama</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={visibleItems.length > 0 && visibleItems.every((i) => selected.has(i.id))}
              onChange={toggleAll}
            />
            Pilih semua
          </label>
          <button
            className="btn-danger"
            disabled={selected.size === 0 || pending}
            onClick={onDelete}
          >
            {pending ? "Memadam..." : `Padam (${selected.size})`}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 space-y-3">
          <p>Tiada rekod pergerakan.</p>
          <Link href="/new" className="btn-primary inline-flex">
            Daftar pergerakan baharu
          </Link>
        </div>
      ) : isSearching ? (
        searchResults.length === 0 ? (
          noMatch
        ) : (
          <div className="space-y-2">
            <p className="px-1 text-xs text-slate-500">
              Hasil carian merentas bulan · {searchResults.length} rekod
            </p>
            {searchResults.map(renderCard)}
          </div>
        )
      ) : availableMonths.length === 0 ? (
        noMatch
      ) : (
        <div className="space-y-3">
          <div className="card p-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div className="flex flex-col items-center gap-0.5 sm:order-2 sm:flex-1 sm:px-2">
              <DatePickerButton
                type="month"
                value={activeMonth ?? CURRENT_YM}
                onChange={(v) => setSelectedMonth(v)}
                ariaLabel="Pilih bulan untuk lompat ke rekod"
                label={monthLabel(activeMonth ?? CURRENT_YM)}
              />
              {activeMonth && monthSummaries.get(activeMonth) ? (
                <span className="text-[11px] text-slate-500 tabular-nums">
                  {monthSummaries.get(activeMonth)}
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 sm:mt-0 sm:contents">
              <button
                type="button"
                className="btn-secondary w-full justify-center text-sm py-2.5 whitespace-nowrap sm:order-1 sm:w-auto disabled:opacity-40"
                disabled={!olderMonth}
                onClick={() => olderMonth && setSelectedMonth(olderMonth)}
              >
                ← Bulan lepas
              </button>
              <button
                type="button"
                className="btn-secondary w-full justify-center text-sm py-2.5 whitespace-nowrap sm:order-3 sm:w-auto disabled:opacity-40"
                disabled={!newerMonth}
                onClick={() => newerMonth && setSelectedMonth(newerMonth)}
              >
                Bulan depan →
              </button>
            </div>
          </div>

          {monthItems.length === 0 ? (
            <div className="card p-6 text-center text-slate-500 space-y-3">
              <p>
                Tiada rekod untuk {monthLabel(activeMonth ?? CURRENT_YM)}
                {oprFilter !== "all" ? " dengan penapis ini" : ""}.
              </p>
              <button
                type="button"
                className="btn-secondary inline-flex"
                onClick={() => setSelectedMonth(null)}
              >
                Pergi ke bulan terkini
              </button>
            </div>
          ) : (
            <div className="space-y-2">{monthItems.map(renderCard)}</div>
          )}
        </div>
      )}
    </div>
  );
}
