"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { deletePergerakanIds } from "@/lib/actions/pergerakan";
import PergerakanCard, { type PergerakanCardData } from "@/components/PergerakanCard";
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

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return format(d, "MMMM yyyy");
}

function defaultOpenYears(): Set<string> {
  return new Set([format(new Date(), "yyyy")]);
}

export default function MyClient({ items }: { items: MyItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [oprFilter, setOprFilter] = useState<OprTodoFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("tarikh");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openYears, setOpenYears] = useState<Set<string>>(() => defaultOpenYears());
  const [openMonths, setOpenMonths] = useState<Set<string>>(() => new Set());

  const oprCounts = useMemo(() => countByOprCategory(items), [items]);

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

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const c = compareItems(a, b, sortKey);
      return sortDir === "asc" ? c : -c;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const grouped = useMemo(() => {
    const byYear = new Map<string, Map<string, MyItem[]>>();
    for (const it of sorted) {
      const y = format(new Date(it.tarikhPergi), "yyyy");
      const ym = format(new Date(it.tarikhPergi), "yyyy-MM");
      const yearMap = byYear.get(y) ?? new Map<string, MyItem[]>();
      const list = yearMap.get(ym) ?? [];
      list.push(it);
      yearMap.set(ym, list);
      byYear.set(y, yearMap);
    }

    const years = [...byYear.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    return years.map(([y, monthsMap]) => {
      const months = [...monthsMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));
      const total = months.reduce((acc, [, list]) => acc + list.length, 0);
      return { year: y, months, total };
    });
  }, [sorted]);

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

  function toggleYear(y: string) {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(y)) next.delete(y);
      else next.add(y);
      return next;
    });
  }

  function toggleMonth(ym: string) {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(ym)) next.delete(ym);
      else next.add(ym);
      return next;
    });
  }

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map((i) => i.id)));
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

  return (
    <div className="space-y-4">
      <div className="card p-3 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {OPR_FILTERS.map((f) => {
            const count =
              f.key === "all"
                ? items.length
                : oprCounts[f.key as keyof typeof oprCounts] ?? 0;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setOprFilter(f.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  oprFilter === f.key
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300",
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
              checked={sorted.length > 0 && selected.size === sorted.length}
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

      {sorted.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 space-y-3">
          <p>
            {items.length === 0
              ? "Tiada rekod pergerakan."
              : "Tiada rekod sepadan dengan penapis."}
          </p>
          {items.length === 0 ? (
            <Link href="/new" className="btn-primary inline-flex">
              Daftar pergerakan baharu
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((g) => {
            const yOpen = openYears.has(g.year);
            return (
              <section
                key={g.year}
                className="rounded-lg border border-slate-200 bg-white overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                  onClick={() => toggleYear(g.year)}
                  aria-expanded={yOpen}
                >
                  <span className="text-slate-400 text-xs w-4 shrink-0" aria-hidden>
                    {yOpen ? "▼" : "▶"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <h2 className="text-sm font-semibold text-slate-800">{g.year}</h2>
                      <span className="text-xs text-slate-500">{g.total} rekod</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {yOpen ? "Klik bulan untuk lihat rekod." : `${g.months.length} bulan`}
                    </p>
                  </div>
                </button>

                {yOpen ? (
                  <div className="border-t border-slate-100">
                    {g.months.map(([ym, groupItems], idx) => {
                      const open = openMonths.has(ym);
                      return (
                        <div
                          key={ym}
                          className={cn(idx !== 0 && "border-t border-slate-100")}
                        >
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                            onClick={() => toggleMonth(ym)}
                            aria-expanded={open}
                          >
                            <span className="text-slate-400 text-xs w-4 shrink-0" aria-hidden>
                              {open ? "▼" : "▶"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <h3 className="text-sm font-semibold text-slate-800">
                                  {monthLabel(ym)}
                                </h3>
                                <span className="text-xs text-slate-500">
                                  {groupItems.length} rekod
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                {monthSummaries.get(ym)}
                              </p>
                            </div>
                          </button>

                          {open ? (
                            <div className="px-3 pb-3 space-y-2 pt-2">
                              {groupItems.map((it) => (
                                <PergerakanCard
                                  key={it.id}
                                  variant="mine"
                                  item={it}
                                  selected={selected.has(it.id)}
                                  onToggleSelect={() => toggle(it.id)}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
