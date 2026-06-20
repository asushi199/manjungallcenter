"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/cn";
import {
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { sektorStyle } from "@/lib/sektor-colors";
import { OPR_FOKUS_OPTIONS } from "@/lib/opr-fokus";
import SektorFilterDropdown from "@/components/SektorFilterDropdown";
import type { SektorOption } from "@/components/FilterBar";
import type { AnalisisAggregates, FokusAggregates } from "@/lib/analisis/cluster-programs";
import type { LaporanOprRange } from "@/lib/laporan-opr-period";
import { replaceWithSearchParams } from "@/lib/navigate";

const BRAND = "#b81049";
/** Jalur atas — bezakan jenis analisis */
const ACCENT_PERGERAKAN = BRAND;
const ACCENT_PROGRAM = "#0d9488";
const ACCENT_FOKUS = "#7c3aed";

/** Warna tetap bagi setiap kategori fokus (konsisten antara carta taburan & trend). */
const FOKUS_PALETTE = ["#7c3aed", "#0d9488", "#b81049", "#ea580c", "#0369a1", "#65a30d"];
const FOKUS_NONE_COLOR = "#94a3b8";

function fokusColor(name: string): string {
  if (name === "Tidak ditetapkan") return FOKUS_NONE_COLOR;
  const i = (OPR_FOKUS_OPTIONS as readonly string[]).indexOf(name);
  return i >= 0 ? FOKUS_PALETTE[i % FOKUS_PALETTE.length] : "#64748b";
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`﻿${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: "shrink-0",
};

function DownloadIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M7 11l5 5 5-5" />
      <path d="M12 4v12" />
    </svg>
  );
}

function PrinterIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6 9V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5" />
      <path d="M6 17H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1" />
      <rect x="7" y="14" width="10" height="7" rx="1" />
    </svg>
  );
}

const RANGE_OPTIONS: { value: LaporanOprRange; label: string }[] = [
  { value: "year", label: "Tahun" },
  { value: "month", label: "Bulan" },
  { value: "all", label: "Semua tempoh" },
];

type Props = {
  sektors: SektorOption[];
  sektorFilterLocked?: boolean;
  pergerakanAggregates: AnalisisAggregates;
  programAggregates: AnalisisAggregates;
  fokusAggregates: FokusAggregates;
  current: {
    range: LaporanOprRange;
    month: string;
    year: string;
    periodLabel: string;
    chartYear: string;
    sektorIds: number[];
  };
};

function toLineData(aggregates: AnalisisAggregates) {
  return aggregates.byMonth.map((m) => ({
    name: m.label,
    count: m.count,
    fullMonth: m.month,
  }));
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mac",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Ogos",
  "Sep",
  "Okt",
  "Nov",
  "Dis",
];

/** Pada skrin sempit, papar nombor bulan (1–12) supaya label tidak berhimpit. */
function monthNumberLabel(value: string): string {
  const i = MONTH_NAMES.indexOf(value);
  return i >= 0 ? String(i + 1) : value;
}

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return narrow;
}

function RankedBars({
  items,
  total,
  emptyText = "Tiada data dalam tempoh ini.",
}: {
  items: { label: string; count: number; color: string }[];
  total?: number;
  emptyText?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-6">{emptyText}</p>;
  }
  const sum = total ?? items.reduce((s, i) => s + i.count, 0);
  const max = Math.max(1, ...items.map((i) => i.count));

  return (
    <div className="space-y-2.5">
      {items.map((it) => {
        const pct = sum ? Math.round((it.count / sum) * 100) : 0;
        const fillPct = Math.round((it.count / max) * 100);
        return (
          <div key={it.label}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="flex items-center gap-1.5 text-sm text-slate-700 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: it.color }}
                  aria-hidden
                />
                <span className="truncate" title={it.label}>
                  {it.label}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-sm text-slate-800">
                <span className="font-semibold">{it.count}</span>{" "}
                <span className="text-slate-400 text-xs">{pct}%</span>
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                key={`${it.label}:${it.count}`}
                className="rankbar-fill h-full rounded-full"
                style={{ width: `${fillPct}%`, backgroundColor: it.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StackedRankedBars({
  rows,
  series,
}: {
  rows: { label: string; total: number; counts: Record<string, number> }[];
  series: { key: string; color: string }[];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-6">Tiada data dalam tempoh ini.</p>;
  }
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));

  return (
    <div className="space-y-4">
      {rows.map((r) => {
        const widthPct = Math.round((r.total / maxTotal) * 100);
        // Cip: hanya fokus yang wujud, disusun terbanyak dahulu dalam sektor ini.
        const present = series
          .filter((s) => (r.counts[s.key] ?? 0) > 0)
          .sort((a, b) => (r.counts[b.key] ?? 0) - (r.counts[a.key] ?? 0));
        return (
          <div key={r.label}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-sm text-slate-700 truncate" title={r.label}>
                {r.label}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">
                {r.total}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                key={`${r.label}:${r.total}`}
                className="rankbar-fill h-full flex overflow-hidden rounded-full"
                style={{ width: `${widthPct}%` }}
              >
                {present.map((s) => (
                  <span
                    key={s.key}
                    title={`${s.key}: ${r.counts[s.key]}`}
                    style={{
                      width: `${((r.counts[s.key] ?? 0) / r.total) * 100}%`,
                      backgroundColor: s.color,
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {present.map((s) => (
                <span
                  key={s.key}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 rounded-md px-2 py-0.5 tabular-nums"
                >
                  <span
                    className="w-2 h-2 rounded-sm shrink-0"
                    style={{ backgroundColor: s.color }}
                    aria-hidden
                  />
                  {s.key} <span className="font-semibold text-slate-800">{r.counts[s.key]}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AnalisisSection({
  title,
  count,
  hint,
  accentColor,
  children,
}: {
  title: string;
  count: number;
  hint: string;
  accentColor: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} aria-hidden />
      <div className="px-4 pt-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <span className="text-2xl font-bold tabular-nums" style={{ color: accentColor }}>
            {count}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
      </div>
      <div className="px-4 pb-4 pt-3 space-y-4">{children}</div>
    </div>
  );
}

function ChartsBlock({
  aggregates,
  chartYear,
  range,
  lineLabel,
  barLabel,
  barHint,
}: {
  aggregates: AnalisisAggregates;
  chartYear: string;
  range: LaporanOprRange;
  lineLabel: string;
  barLabel: string;
  barHint: string;
}) {
  const compactMonths = useIsNarrow();
  const lineData = toLineData(aggregates);
  const sektorItems = aggregates.bySektor.map((s) => ({
    label: s.name,
    count: s.count,
    color: sektorStyle(s.code === "—" ? null : s.code).chip,
  }));

  return (
    <div className="grid lg:grid-cols-2 gap-4 min-w-0">
      <div className="card p-4 min-w-0">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">{lineLabel}</h3>
        <p className="text-xs text-slate-500 mb-4">
          {range === "all" ? "Semua tahun, mengikut bulan kalendar" : `Tahun ${chartYear}`}
        </p>
        <div className="h-[260px] w-full min-w-0 overflow-x-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                interval={0}
                tickFormatter={compactMonths ? monthNumberLabel : undefined}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
              <Tooltip
                formatter={(value: number) => [value, lineLabel]}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as { fullMonth?: string } | undefined;
                  return p?.fullMonth ?? "";
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke={BRAND}
                strokeWidth={2}
                dot={{ fill: "#fff", stroke: BRAND, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              >
                <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: "#64748b" }} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4 min-w-0">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">{barLabel}</h3>
        <p className="text-xs text-slate-500 mb-4">{barHint}</p>
        <RankedBars items={sektorItems} />
      </div>
    </div>
  );
}

function FokusBlock({ aggregates }: { aggregates: FokusAggregates }) {
  const compactMonths = useIsNarrow();
  const { total, byFokus, fokusKeys, bySektorFokus } = aggregates;
  if (total === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-6">
        Tiada OPR siap dalam tempoh ini.
      </p>
    );
  }

  const fokusItems = byFokus.map((f) => ({
    label: f.fokus,
    count: f.count,
    color: fokusColor(f.fokus),
  }));
  const top = byFokus[0];
  const trendData = aggregates.byMonth.map((m) => ({ label: m.label, ...m.counts }));
  const crossSeriesObjs = byFokus.map((f) => ({ key: f.fokus, color: fokusColor(f.fokus) }));
  const crossRows = bySektorFokus.map((s) => ({
    label: s.name,
    total: s.total,
    counts: s.counts,
  }));
  const showCross = bySektorFokus.length > 1;

  return (
    <>
      <p className="text-xs text-slate-500 text-center">
        Fokus terbanyak: <strong>{top.fokus}</strong> ({top.count} ·{" "}
        {Math.round((top.count / total) * 100)}%) daripada {total} OPR siap.
      </p>
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Bilangan OPR siap mengikut fokus</h3>
        <p className="text-xs text-slate-500 mb-4">Tempoh dipilih · disusun terbanyak ke atas</p>
        <RankedBars items={fokusItems} total={total} />
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Trend fokus mengikut bulan</h3>
        <p className="text-xs text-slate-500 mb-4">
          Setahun penuh (Jan–Dis) · satu garisan setiap fokus
        </p>
        <div className="h-[280px] w-full min-w-0 overflow-x-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 18, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                interval={0}
                tickFormatter={compactMonths ? monthNumberLabel : undefined}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {fokusKeys.map((k) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={fokusColor(k)}
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  activeDot={{ r: 5 }}
                >
                  <LabelList
                    dataKey={k}
                    content={(props) => {
                      const v = Number(props.value);
                      if (!v) return null;
                      return (
                        <text
                          x={Number(props.x)}
                          y={Number(props.y) - 6}
                          textAnchor="middle"
                          fontSize={10}
                          fontWeight={600}
                          fill={fokusColor(k)}
                        >
                          {v}
                        </text>
                      );
                    }}
                  />
                </Line>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showCross && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Fokus mengikut sektor</h3>
          <p className="text-xs text-slate-500 mb-4">
            Tempoh dipilih · bar bertindan mengikut fokus
          </p>
          <StackedRankedBars rows={crossRows} series={crossSeriesObjs} />
        </div>
      )}
    </>
  );
}

export default function AnalisisPergerakanClient({
  sektors,
  sektorFilterLocked = false,
  pergerakanAggregates,
  programAggregates,
  fokusAggregates,
  current,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"pergerakan" | "opr">("opr");

  // OPR didahulukan (lebih penting); Pergerakan kedua.
  const MAIN_TABS: { key: "pergerakan" | "opr"; label: string; accent: string }[] = [
    { key: "opr", label: "OPR", accent: ACCENT_PROGRAM },
    { key: "pergerakan", label: "Pergerakan", accent: ACCENT_PERGERAKAN },
  ];
  const tabLabel = tab === "opr" ? "OPR" : "Pergerakan";

  function onPrint() {
    // Seksyen sentiasa terbuka — carta sudah bersaiz penuh; beri sedikit masa
    // untuk recharts ukur semula sebelum dialog cetak.
    setTimeout(() => window.print(), 100);
  }

  function onCsv() {
    const lines: string[] = [];
    const row = (...cells: Array<string | number>) => lines.push(cells.map(csvCell).join(","));

    if (tab === "pergerakan") {
      row(`Analisis Pergerakan`, current.periodLabel);
      lines.push("");
      row("Pergerakan mengikut bulan");
      row("Bulan", "Bilangan");
      pergerakanAggregates.byMonth.forEach((m) => row(m.month, m.count));
      lines.push("");
      row("Pergerakan mengikut sektor");
      row("Sektor", "Bilangan");
      pergerakanAggregates.bySektor.forEach((s) => row(s.name, s.count));
    } else {
      row(`Analisis OPR`, current.periodLabel);
      lines.push("");
      row("Program mengikut bulan");
      row("Bulan", "Bilangan");
      programAggregates.byMonth.forEach((m) => row(m.month, m.count));
      lines.push("");
      row("Program mengikut sektor");
      row("Sektor", "Bilangan");
      programAggregates.bySektor.forEach((s) => row(s.name, s.count));
      lines.push("");
      row("Fokus (taburan)");
      row("Fokus", "Bilangan", "Peratus");
      fokusAggregates.byFokus.forEach((f) =>
        row(f.fokus, f.count, fokusAggregates.total ? `${Math.round((f.count / fokusAggregates.total) * 100)}%` : "0%"),
      );
      lines.push("");
      row("Fokus mengikut bulan");
      row("Bulan", ...fokusAggregates.fokusKeys);
      fokusAggregates.byMonth.forEach((m) =>
        row(m.month, ...fokusAggregates.fokusKeys.map((k) => m.counts[k] ?? 0)),
      );
      lines.push("");
      const crossKeys = fokusAggregates.byFokus.map((f) => f.fokus);
      row("Fokus mengikut sektor");
      row("Sektor", ...crossKeys, "Jumlah");
      fokusAggregates.bySektorFokus.forEach((s) =>
        row(s.name, ...crossKeys.map((k) => s.counts[k] ?? 0), s.total),
      );
    }

    const periodTag = current.range === "month" ? current.month : current.year;
    downloadCsv(`analisis-${tab}-${periodTag}.csv`, lines.join("\n"));
  }

  function patch(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params?.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    startTransition(() => {
      replaceWithSearchParams(router, "/admin/analisis-pergerakan", sp);
    });
  }

  return (
    <div className="space-y-6">
      <div className="card p-4 flex flex-wrap gap-4 items-end print:hidden">
        {isPending && (
          <p className="text-xs font-medium text-brand-700 w-full" role="status">
            Memuatkan…
          </p>
        )}
        <div>
          <label className="label" htmlFor="analisis-range">
            Tempoh
          </label>
          <select
            id="analisis-range"
            className="input min-w-[8rem]"
            value={current.range}
            disabled={isPending}
            onChange={(e) => {
              const range = e.target.value as LaporanOprRange;
              patch({ range, month: current.month, year: current.year });
            }}
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {current.range === "year" || current.range === "all" ? (
          <div>
            <label className="label" htmlFor="analisis-year">
              Tahun (carta)
            </label>
            <input
              id="analisis-year"
              type="number"
              className="input w-[6.5rem]"
              min={2020}
              max={2100}
              value={current.year}
              disabled={isPending}
              onChange={(e) => patch({ year: e.target.value, range: current.range })}
            />
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="analisis-month">
              Bulan
            </label>
            <input
              id="analisis-month"
              type="month"
              className="input"
              value={current.month}
              disabled={isPending}
              onChange={(e) =>
                patch({
                  range: "month",
                  month: e.target.value,
                  year: e.target.value.slice(0, 4),
                })
              }
            />
          </div>
        )}

        {!sektorFilterLocked && (
          <div className="min-w-[12rem] flex-1">
            <SektorFilterDropdown
              sektors={sektors}
              selectedIds={current.sektorIds}
              disabled={isPending}
              label="Sektor"
              onChange={(sektorIds) => {
                patch({
                  sektor: sektorIds.length ? sektorIds.join(",") : undefined,
                });
              }}
            />
          </div>
        )}
      </div>

      <p className="text-sm text-slate-600 print:hidden">
        Tempoh paparan: <strong>{current.periodLabel}</strong>
        {current.range === "month" && (
          <> · Carta bulanan = tahun {current.chartYear} (konteks penuh)</>
        )}
        {current.range === "all" && " · Carta bulanan = semua tahun (ikut bulan Jan–Dis)"}
      </p>

      <div className="flex items-center gap-1 border-b border-slate-200 print:hidden" role="tablist">
        {MAIN_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                active
                  ? "text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700",
              )}
              style={active ? { borderColor: t.accent, color: t.accent } : undefined}
            >
              {t.label}
            </button>
          );
        })}
        <div className="ml-auto flex gap-2 pb-1">
          <button
            type="button"
            className="btn-secondary text-sm gap-1.5"
            onClick={onCsv}
            title="Muat turun CSV"
            aria-label="Muat turun CSV"
          >
            <DownloadIcon />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            type="button"
            className="btn-primary text-sm gap-1.5"
            onClick={onPrint}
            title="Cetak / PDF"
            aria-label="Cetak / PDF"
          >
            <PrinterIcon />
            <span className="hidden sm:inline">Cetak PDF</span>
          </button>
        </div>
      </div>

      <div className="analisis-print-area space-y-3">
        <div className="hidden print:block mb-3">
          <h2 className="text-base font-bold">Analisis {tabLabel} — PPD Manjung</h2>
          <p className="text-xs text-slate-600">Tempoh: {current.periodLabel}</p>
        </div>

        {tab === "pergerakan" ? (
        <div className="space-y-3">
          <AnalisisSection
            title="Analisis pergerakan"
            count={pergerakanAggregates.totalRecords}
            hint="Setiap rekod pergerakan = 1 · ikut sektor pendaftaran"
            accentColor={ACCENT_PERGERAKAN}
          >
            <p className="text-xs text-slate-500 text-center">
              Tidak termasuk cuti/Bercuti. Tiada penggabungan aktiviti.
            </p>
            <ChartsBlock
              aggregates={pergerakanAggregates}
              chartYear={current.chartYear}
              range={current.range}
              lineLabel="Pergerakan"
              barLabel="Pergerakan mengikut sektor"
              barHint="Tempoh dipilih · sektor pendaftaran rekod"
            />
          </AnalisisSection>
        </div>
      ) : (
        <div className="space-y-3">
          <AnalisisSection
            title="Analisis fokus"
            count={fokusAggregates.total}
            hint="OPR siap mengikut jenis fokus · lihat fokus paling kerap"
            accentColor={ACCENT_FOKUS}
          >
            <FokusBlock aggregates={fokusAggregates} />
          </AnalisisSection>

          <AnalisisSection
            title="Analisis program (OPR siap)"
            count={programAggregates.totalRecords}
            hint="Satu OPR siap = satu program · ikut sektor yang menghantar OPR"
            accentColor={ACCENT_PROGRAM}
          >
            <p className="text-xs text-slate-500 text-center">
              Hanya OPR berstatus <strong>SIAP</strong>. Sektor = override OPR (jika ada) atau sektor
              pegawai.
            </p>
            <ChartsBlock
              aggregates={programAggregates}
              chartYear={current.chartYear}
              range={current.range}
              lineLabel="Program"
              barLabel="Program mengikut sektor"
              barHint="Tempoh dipilih · sektor penghantar OPR siap"
            />
          </AnalisisSection>
        </div>
      )}
      </div>
    </div>
  );
}
