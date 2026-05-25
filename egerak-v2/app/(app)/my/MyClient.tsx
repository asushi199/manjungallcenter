"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { deletePergerakanIds } from "@/lib/actions/pergerakan";
import PergerakanCard, { type PergerakanCardData } from "@/components/PergerakanCard";

type SortKey = "tarikh" | "urusan" | "lokasi" | "sektor" | "opr";

const OPR_SORT_RANK: Record<string, number> = { SIAP: 2, DRAFT: 1 };

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "tarikh", label: "Tarikh" },
  { key: "urusan", label: "Urusan" },
  { key: "lokasi", label: "Lokasi" },
  { key: "sektor", label: "Sektor" },
  { key: "opr", label: "Status OPR" },
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

export default function MyClient({ items }: { items: MyItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("tarikh");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.urusan.toLowerCase().includes(q) ||
        it.lokasi.toLowerCase().includes(q) ||
        (it.sektorName ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const c = compareItems(a, b, sortKey);
      return sortDir === "asc" ? c : -c;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const grouped = useMemo(() => {
    const map = new Map<string, MyItem[]>();
    for (const it of sorted) {
      const ym = format(new Date(it.tarikhPergi), "yyyy-MM");
      const list = map.get(ym) ?? [];
      list.push(it);
      map.set(ym, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [sorted]);

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
      <div className="card p-3 flex flex-wrap items-center gap-2">
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

      {sorted.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 space-y-3">
          <p>Tiada rekod pergerakan.</p>
          <Link href="/new" className="btn-primary inline-flex">
            Daftar pergerakan baharu
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([ym, groupItems]) => (
            <section key={ym} className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-600 px-0.5">{monthLabel(ym)}</h2>
              <div className="space-y-2">
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
