"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { deletePergerakanIds } from "@/lib/actions/pergerakan";
import { sektorRowStyle } from "@/lib/sektor-colors";
import { oprStatusBadge } from "@/lib/opr-status";
import { cn } from "@/lib/cn";

type Item = {
  id: number;
  nama: string;
  jenis: "Pergerakan" | "Bercuti";
  urusan: string;
  lokasi: string;
  sektorCode: string | null;
  sektorName: string | null;
  tarikhPergi: string;
  tarikhKembali: string;
  oprStatus: "TIADA" | "DRAFT" | "SIAP" | null;
};

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMMM yyyy");
}

function defaultOpenYears(): Set<string> {
  return new Set([format(new Date(), "yyyy")]);
}

export default function AdminPergerakanClient({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [openYears, setOpenYears] = useState<Set<string>>(() => defaultOpenYears());
  const [openMonths, setOpenMonths] = useState<Set<string>>(() => new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.nama.toLowerCase().includes(q) ||
        it.urusan.toLowerCase().includes(q) ||
        it.lokasi.toLowerCase().includes(q) ||
        (it.sektorName ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  const grouped = useMemo(() => {
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.tarikhPergi).getTime() - new Date(a.tarikhPergi).getTime(),
    );
    const byYear = new Map<string, Map<string, Item[]>>();
    for (const it of sorted) {
      const y = format(new Date(it.tarikhPergi), "yyyy");
      const ym = format(new Date(it.tarikhPergi), "yyyy-MM");
      const yearMap = byYear.get(y) ?? new Map<string, Item[]>();
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
  }, [filtered]);

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

  function toggleMonthSelection(monthItems: Item[]) {
    const ids = monthItems.map((i) => i.id);
    const allSelected = ids.every((id) => selected.has(id));
    const next = new Set(selected);
    if (allSelected) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    setSelected(next);
  }

  function onDelete() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Padam ${selected.size} pergerakan?\n\nTempahan bilik yang berkaitan akan dibatalkan secara automatik.`,
      )
    )
      return;
    startTransition(async () => {
      const r = await deletePergerakanIds([...selected]);
      alert(`${r.deleted} rekod dipadam.`);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
        Padam di sini akan <strong>nyahaktifkan pergerakan</strong> dan{" "}
        <strong>batalkan tempahan bilik</strong> yang dipautkan. Laporan OPR siap tidak lagi
        dipaparkan dalam ringkasan.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input flex-1 min-w-[200px]"
          placeholder="Carian nama / urusan / sektor..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className="btn-danger"
          disabled={selected.size === 0 || pending}
          onClick={onDelete}
        >
          {pending ? "Memadam..." : `Padam dipilih (${selected.size})`}
        </button>
      </div>

      {grouped.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">Tiada rekod aktif.</div>
      ) : (
        <div className="space-y-3">
          {grouped.map((g) => {
            const yOpen = openYears.has(g.year);
            return (
              <section
                key={g.year}
                className="rounded-lg border border-slate-200 bg-white overflow-hidden scroll-mt-20"
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
                    {g.months.map(([ym, monthItems], idx) => {
                      const open = openMonths.has(ym);
                      const monthAllSelected =
                        monthItems.length > 0 && monthItems.every((i) => selected.has(i.id));
                      return (
                        <div key={ym} className={cn(idx !== 0 && "border-t border-slate-100")}>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                            onClick={() => toggleMonth(ym)}
                            aria-expanded={open}
                          >
                            <span className="text-slate-400 text-xs w-4 shrink-0" aria-hidden>
                              {open ? "▼" : "▶"}
                            </span>
                            <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <h3 className="text-sm font-semibold text-slate-800">
                                {monthLabel(ym)}
                              </h3>
                              <span className="text-xs text-slate-500">
                                {monthItems.length} rekod
                              </span>
                            </div>
                          </button>

                          {open ? (
                            <div className="px-3 pb-3 pt-1 space-y-2">
                              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={monthAllSelected}
                                  onChange={() => toggleMonthSelection(monthItems)}
                                />
                                Pilih semua bulan ini
                              </label>
                              <div className="overflow-x-auto rounded-md border border-slate-100">
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                      <th className="px-3 py-2 w-8" />
                                      <th className="px-3 py-2 text-left">Pegawai</th>
                                      <th className="px-3 py-2 text-left">Urusan</th>
                                      <th className="px-3 py-2 text-left whitespace-nowrap">
                                        Tarikh
                                      </th>
                                      <th className="px-3 py-2 text-left">OPR</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {monthItems.map((it) => {
                                      const rowStyle = sektorRowStyle(it.sektorCode, it.jenis);
                                      const badge = oprStatusBadge(it.oprStatus ?? undefined);
                                      return (
                                        <tr
                                          key={it.id}
                                          className="border-t border-black/5"
                                          style={rowStyle}
                                        >
                                          <td className="px-3 py-2 align-top">
                                            <input
                                              type="checkbox"
                                              checked={selected.has(it.id)}
                                              onChange={() => toggle(it.id)}
                                            />
                                          </td>
                                          <td className="px-3 py-2 align-top">
                                            <div className="font-medium">{it.nama}</div>
                                            <div className="text-xs text-slate-600">
                                              {it.sektorName ?? "—"}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2 align-top">
                                            {it.urusan}
                                            {it.lokasi ? (
                                              <div className="text-xs text-slate-600">
                                                {it.lokasi}
                                              </div>
                                            ) : null}
                                          </td>
                                          <td className="px-3 py-2 align-top whitespace-nowrap text-slate-700">
                                            {format(new Date(it.tarikhPergi), "dd-MM-yyyy")}
                                          </td>
                                          <td className="px-3 py-2 align-top">
                                            {badge ? (
                                              <span className={`badge ${badge.className}`}>
                                                {badge.label}
                                              </span>
                                            ) : (
                                              "—"
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
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
