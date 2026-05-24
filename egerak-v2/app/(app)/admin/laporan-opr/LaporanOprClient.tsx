"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { SortableTh, type SortDir } from "@/components/SortableTh";
import { formatInTimeZone } from "date-fns-tz";
import SektorFilterDropdown from "@/components/SektorFilterDropdown";
import { sektorRowStyle, sektorStyle } from "@/lib/sektor-colors";
import { formatDate } from "@/lib/dates";
import { TZ } from "@/lib/dates";
import type { LaporanOprRow } from "@/lib/actions/laporan-opr";
import type { SektorOption } from "@/components/FilterBar";
import type { LaporanOprRange } from "@/lib/laporan-opr-period";
import { cn } from "@/lib/cn";
import { replaceWithSearchParams } from "@/lib/navigate";

/** Baris dari RSC — tarikh diserialkan sebagai ISO string. */
export type LaporanOprRowSerialized = Omit<
  LaporanOprRow,
  "tarikhPergi" | "tarikhKembali" | "updatedAt"
> & {
  tarikhPergi: string;
  tarikhKembali: string;
  updatedAt: string;
};

type Props = {
  rows: LaporanOprRowSerialized[];
  sektors: SektorOption[];
  /** Ketua Unit — tapisan sektor dikunci pada profil. */
  sektorFilterLocked?: boolean;
  current: {
    range: LaporanOprRange;
    month: string;
    year: string;
    periodLabel: string;
    sektorIds: number[];
    q: string;
  };
};

const RANGE_OPTIONS: { value: LaporanOprRange; label: string }[] = [
  { value: "month", label: "Bulan" },
  { value: "year", label: "Tahun" },
  { value: "all", label: "Semua" },
];

type Group = {
  sektorId: number | null;
  sektorCode: string | null;
  sektorName: string;
  items: LaporanOprRowSerialized[];
};

type SortKey = "nama" | "jawatan" | "urusan" | "lokasi" | "tarikh" | "updatedAt" | "sektor";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "tarikh", label: "Tarikh aktiviti" },
  { value: "updatedAt", label: "Tarikh siap OPR" },
  { value: "nama", label: "Nama pegawai" },
  { value: "jawatan", label: "Jawatan" },
  { value: "urusan", label: "Urusan / program" },
  { value: "lokasi", label: "Lokasi" },
  { value: "sektor", label: "Sektor" },
];

function compareRows(a: LaporanOprRowSerialized, b: LaporanOprRowSerialized, key: SortKey): number {
  switch (key) {
    case "nama":
      return a.nama.localeCompare(b.nama, "ms");
    case "jawatan":
      return a.jawatan.localeCompare(b.jawatan, "ms") || a.nama.localeCompare(b.nama, "ms");
    case "urusan":
      return a.urusan.localeCompare(b.urusan, "ms");
    case "lokasi":
      return (a.lokasi || "").localeCompare(b.lokasi || "", "ms");
    case "tarikh":
      return new Date(a.tarikhPergi).getTime() - new Date(b.tarikhPergi).getTime();
    case "updatedAt":
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    case "sektor":
      return (a.sektorName || "").localeCompare(b.sektorName || "", "ms") || compareRows(a, b, "nama");
    default:
      return 0;
  }
}

export default function LaporanOprClient({
  rows,
  sektors,
  current,
  sektorFilterLocked = false,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [sortKey, setSortKey] = useState<SortKey>("tarikh");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = current.q.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.nama.toLowerCase().includes(q) ||
        r.urusan.toLowerCase().includes(q) ||
        r.lokasi.toLowerCase().includes(q) ||
        (r.sektorName ?? "").toLowerCase().includes(q),
    );
  }, [rows, current.q]);

  const sortedFiltered = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const c = compareRows(a, b, sortKey);
      return sortDir === "asc" ? c : -c;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  function onSort(column: SortKey) {
    if (sortKey === column) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(column);
      setSortDir(column === "tarikh" || column === "updatedAt" ? "desc" : "asc");
    }
  }

  const activeSortLabel = SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? sortKey;

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const r of sortedFiltered) {
      const key = r.sektorId != null ? String(r.sektorId) : "_none";
      const existing = map.get(key);
      if (existing) existing.items.push(r);
      else {
        map.set(key, {
          sektorId: r.sektorId,
          sektorCode: r.sektorCode,
          sektorName: r.sektorName ?? "Tiada sektor",
          items: [r],
        });
      }
    }
    const list = [...map.values()];
    list.sort((a, b) => a.sektorName.localeCompare(b.sektorName, "ms"));
    return list;
  }, [sortedFiltered]);

  useEffect(() => {
    // Sektor baharu (cth. selepas tapisan) — default sembunyi.
    setCollapsed((prev) => {
      const next = { ...prev };
      for (const g of groups) {
        const key = g.sektorId != null ? String(g.sektorId) : "_none";
        if (!(key in next)) next[key] = true;
      }
      return next;
    });
  }, [groups]);

  function toggleGroup(key: string) {
    setCollapsed((m) => ({ ...m, [key]: !(m[key] ?? true) }));
  }

  function isGroupCollapsed(key: string) {
    return collapsed[key] ?? true;
  }

  function setAllCollapsed(nextCollapsed: boolean) {
    setCollapsed((m) => {
      const next = { ...m };
      for (const g of groups) {
        const key = g.sektorId != null ? String(g.sektorId) : "_none";
        next[key] = nextCollapsed;
      }
      return next;
    });
  }

  function replaceParams(
    patch: Partial<{
      range: LaporanOprRange;
      month: string;
      year: string;
      sektorIds: number[];
      q: string;
    }>,
  ) {
    const next = new URLSearchParams(params?.toString());
    const range = patch.range ?? current.range;
    const month = patch.month ?? current.month;
    const year = patch.year ?? current.year;
    const sektorIds = patch.sektorIds ?? current.sektorIds;
    const q = patch.q ?? current.q;

    next.set("range", range);
    next.set("month", month);
    next.set("year", year);
    if (sektorIds.length) next.set("sektor", sektorIds.join(","));
    else next.delete("sektor");
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");

    startTransition(() => {
      replaceWithSearchParams(router, "/admin/laporan-opr", next);
    });
  }

  function setRange(range: LaporanOprRange) {
    const patch: Parameters<typeof replaceParams>[0] = { range };
    if (range === "year" && current.month) {
      patch.year = current.month.slice(0, 4);
    }
    replaceParams(patch);
  }

  function shiftMonth(delta: number) {
    const [y, m] = current.month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    replaceParams({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      year: String(d.getFullYear()),
    });
  }

  function shiftYear(delta: number) {
    replaceParams({ year: String(Number(current.year) + delta) });
  }

  const monthLabel = formatInTimeZone(
    new Date(`${current.month}-01T12:00:00`),
    TZ,
    "MMMM yyyy",
  );

  const periodHint =
    current.range === "all"
      ? "Memaparkan semua laporan OPR siap tanpa had tarikh aktiviti."
      : current.range === "year"
        ? `Tapisan aktiviti yang bertindih dengan tahun ${current.year}.`
        : `Tapisan aktiviti yang bertindih dengan ${monthLabel}.`;

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div>
          <div className="label">Tempoh</div>
          <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={isPending}
                onClick={() => setRange(opt.value)}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  current.range === opt.value
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {current.range === "month" && (
            <div>
              <label className="label" htmlFor="laporan-month">
                Bulan aktiviti
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary px-2"
                  onClick={() => shiftMonth(-1)}
                  disabled={isPending}
                  aria-label="Bulan sebelum"
                >
                  ‹
                </button>
                <input
                  id="laporan-month"
                  type="month"
                  className="input flex-1"
                  value={current.month}
                  onChange={(e) =>
                    replaceParams({
                      month: e.target.value,
                      year: e.target.value.slice(0, 4),
                    })
                  }
                  disabled={isPending}
                />
                <button
                  type="button"
                  className="btn-secondary px-2"
                  onClick={() => shiftMonth(1)}
                  disabled={isPending}
                  aria-label="Bulan seterusnya"
                >
                  ›
                </button>
              </div>
            </div>
          )}

          {current.range === "year" && (
            <div>
              <label className="label" htmlFor="laporan-year">
                Tahun aktiviti
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary px-2"
                  onClick={() => shiftYear(-1)}
                  disabled={isPending}
                  aria-label="Tahun sebelum"
                >
                  ‹
                </button>
                <input
                  id="laporan-year"
                  type="number"
                  min={2000}
                  max={2100}
                  className="input flex-1"
                  value={current.year}
                  onChange={(e) => replaceParams({ year: e.target.value })}
                  disabled={isPending}
                />
                <button
                  type="button"
                  className="btn-secondary px-2"
                  onClick={() => shiftYear(1)}
                  disabled={isPending}
                  aria-label="Tahun seterusnya"
                >
                  ›
                </button>
              </div>
            </div>
          )}

          {current.range === "all" && (
            <div className="flex items-end">
              <p className="text-sm text-slate-600 rounded-md bg-slate-50 border border-slate-200 px-3 py-2 w-full">
                Semua laporan siap dipaparkan. Gunakan tapisan sektor atau carian untuk mengecilkan
                senarai.
              </p>
            </div>
          )}

          <div>
            <label className="label" htmlFor="laporan-q">
              Carian pantas
            </label>
            <input
              id="laporan-q"
              className="input"
              placeholder="Nama, urusan, lokasi..."
              defaultValue={current.q}
              onBlur={(e) => {
                if (e.target.value !== current.q) replaceParams({ q: e.target.value });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  replaceParams({ q: (e.target as HTMLInputElement).value });
                }
              }}
              disabled={isPending}
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">{periodHint}</p>

        {!sektorFilterLocked && (
          <SektorFilterDropdown
            label="Sektor"
            sektors={sektors}
            selectedIds={current.sektorIds}
            onChange={(sektorIds) => replaceParams({ sektorIds })}
            disabled={isPending}
          />
        )}
      </div>

      <div className="card px-4 py-3 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-brand-800">{filtered.length}</span> laporan OPR
          siap · {groups.length} sektor ·{" "}
          <span className="text-brand-700">{current.periodLabel}</span>
          {current.sektorIds.length > 0 ? " · sektor ditapis" : ""}
        </p>
        <p className="text-xs text-slate-500">Hanya status Siap dipaparkan</p>
      </div>

      {filtered.length > 0 && (
        <div className="card p-3 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[10rem]">
            <label className="label" htmlFor="laporan-sort">
              Susun mengikut
            </label>
            <select
              id="laporan-sort"
              className="input"
              value={sortKey}
              onChange={(e) => onSort(e.target.value as SortKey)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn-secondary shrink-0"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            title={sortDir === "asc" ? "Menaik" : "Menurun"}
          >
            {sortDir === "asc" ? "↑ Menaik" : "↓ Menurun"}
          </button>
          <p className="text-xs text-slate-500 w-full sm:w-auto sm:ml-auto">
            Juga boleh klik tajuk lajur jadual · semasa:{" "}
            <strong>{activeSortLabel}</strong> ({sortDir === "asc" ? "menaik" : "menurun"})
          </p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 text-sm">
          Tiada laporan OPR siap untuk tempoh dan tapisan ini.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <button type="button" className="btn-secondary" onClick={() => setAllCollapsed(false)}>
              Kembangkan semua
            </button>
            <button type="button" className="btn-secondary" onClick={() => setAllCollapsed(true)}>
              Runtuhkan semua
            </button>
            <p className="text-xs text-slate-500">
              Petua: klik tajuk sektor untuk buka/tutup.
            </p>
          </div>

          <div className="space-y-6">
          {groups.map((g) => {
            const st = sektorStyle(g.sektorCode);
            const key = g.sektorId != null ? String(g.sektorId) : "_none";
            const isCollapsed = isGroupCollapsed(key);
            return (
              <section key={g.sektorId ?? "_none"} className="space-y-2">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left"
                  style={{ backgroundColor: st.bg, borderColor: st.border }}
                  onClick={() => toggleGroup(key)}
                  aria-expanded={!isCollapsed}
                >
                  <div className="min-w-0">
                    <h2 className="font-semibold text-sm truncate" style={{ color: st.text }}>
                      {g.sektorName}
                      {g.sektorCode ? (
                        <span className="font-normal opacity-80"> · {g.sektorCode}</span>
                      ) : null}
                    </h2>
                    <span className="text-xs font-medium" style={{ color: st.text }}>
                      {g.items.length} laporan
                    </span>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: st.text }} aria-hidden>
                    {isCollapsed ? "Tunjuk ▾" : "Sembunyi ▴"}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left w-8">#</th>
                        <SortableTh
                          label="Pegawai"
                          column="nama"
                          activeColumn={sortKey}
                          dir={sortDir}
                          onSort={onSort}
                        />
                        <SortableTh
                          label="Jawatan"
                          column="jawatan"
                          activeColumn={sortKey}
                          dir={sortDir}
                          onSort={onSort}
                        />
                        <SortableTh
                          label="Urusan / Program"
                          column="urusan"
                          activeColumn={sortKey}
                          dir={sortDir}
                          onSort={onSort}
                        />
                        <SortableTh
                          label="Lokasi"
                          column="lokasi"
                          activeColumn={sortKey}
                          dir={sortDir}
                          onSort={onSort}
                        />
                        <SortableTh
                          label="Tarikh aktiviti"
                          column="tarikh"
                          activeColumn={sortKey}
                          dir={sortDir}
                          onSort={onSort}
                        />
                        <SortableTh
                          label="Siap OPR"
                          column="updatedAt"
                          activeColumn={sortKey}
                          dir={sortDir}
                          onSort={onSort}
                        />
                        <th className="px-3 py-2 text-left text-slate-600 font-medium">
                          Tindakan
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map((r, i) => (
                        <tr
                          key={r.pergerakanId}
                          className="border-t border-black/5"
                          style={sektorRowStyle(r.sektorCode, r.jenis)}
                        >
                          <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-slate-900">{r.nama}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{r.jawatan || "—"}</td>
                          <td className="px-3 py-2 text-slate-900">{r.urusan}</td>
                          <td className="px-3 py-2 text-slate-700">{r.lokasi || "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                            {formatDate(r.tarikhPergi)}
                            {r.tarikhKembali.slice(0, 10) !== r.tarikhPergi.slice(0, 10) && (
                              <> – {formatDate(r.tarikhKembali)}</>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600 text-xs">
                            {formatDate(r.updatedAt)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <Link
                              href={`/my/${r.pergerakanId}/opr/print`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-700 hover:underline font-medium"
                            >
                              Lihat / Cetak
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </section>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
