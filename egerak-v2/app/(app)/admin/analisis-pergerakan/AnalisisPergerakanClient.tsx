"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/cn";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

function toBarData(aggregates: AnalisisAggregates) {
  return aggregates.bySektor.map((s) => {
    const code = s.code === "—" ? null : s.code;
    return {
      name: s.name.length > 28 ? `${s.name.slice(0, 26)}…` : s.name,
      fullName: s.name,
      count: s.count,
      code,
      fill: sektorStyle(code).chip,
    };
  });
}

function AnalisisCollapsible({
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
  const shellRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function closeSection() {
    const el = detailsRef.current;
    if (!el) return;
    el.open = false;
    shellRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <div
      ref={shellRef}
      className="rounded-lg border border-slate-200 bg-white overflow-hidden"
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} aria-hidden />
      <details ref={detailsRef} className="group">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <span className="text-slate-400 text-xs w-4 shrink-0 group-open:rotate-90 transition-transform">
          ▶
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
            <span
              className="text-lg font-bold tabular-nums"
              style={{ color: accentColor }}
            >
              {count}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
        </div>
      </summary>
      <div className="px-4 pb-4 pt-2 space-y-4 border-t border-slate-100">
        {children}
        <div className="flex justify-center pt-2 border-t border-slate-100 print:hidden">
          <button
            type="button"
            className="btn-secondary text-sm px-4 py-2"
            onClick={closeSection}
          >
            Tutup ▴
          </button>
        </div>
      </div>
      </details>
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
  const lineData = toLineData(aggregates);
  const barData = toBarData(aggregates);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">{lineLabel}</h3>
        <p className="text-xs text-slate-500 mb-4">
          {range === "all" ? "Semua tahun, mengikut bulan kalendar" : `Tahun ${chartYear}`}
        </p>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
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

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">{barLabel}</h3>
        <p className="text-xs text-slate-500 mb-4">{barHint}</p>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value: number) => [value, barLabel]}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as { fullName?: string } | undefined;
                  return p?.fullName ?? "";
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {barData.map((entry) => (
                  <Cell key={entry.code ?? entry.name} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="count"
                  position="right"
                  style={{ fontSize: 10, fill: "#475569" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function FokusBlock({ aggregates }: { aggregates: FokusAggregates }) {
  const { total, byFokus, fokusKeys, bySektorFokus } = aggregates;
  if (total === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-6">
        Tiada OPR siap dalam tempoh ini.
      </p>
    );
  }

  const data = byFokus.map((f) => ({
    name: f.fokus,
    count: f.count,
    pct: Math.round((f.count / total) * 100),
    fill: fokusColor(f.fokus),
  }));
  const top = byFokus[0];
  const trendData = aggregates.byMonth.map((m) => ({ label: m.label, ...m.counts }));
  const crossSeries = byFokus.map((f) => f.fokus);
  const crossData = bySektorFokus.map((s) => ({
    name: s.name.length > 24 ? `${s.name.slice(0, 22)}…` : s.name,
    fullName: s.name,
    ...s.counts,
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
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number, _name, item) => {
                  const p = item?.payload as { pct?: number } | undefined;
                  return [`${value} (${p?.pct ?? 0}%)`, "OPR siap"];
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={32}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="count"
                  position="right"
                  style={{ fontSize: 11, fill: "#475569" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Trend fokus mengikut bulan</h3>
        <p className="text-xs text-slate-500 mb-4">
          Setahun penuh (Jan–Dis) · bar bertindan mengikut fokus
        </p>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {fokusKeys.map((k) => (
                <Bar key={k} dataKey={k} stackId="fokus" fill={fokusColor(k)} maxBarSize={36} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showCross && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Fokus mengikut sektor</h3>
          <p className="text-xs text-slate-500 mb-4">
            Tempoh dipilih · bar bertindan mengikut fokus
          </p>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={crossData}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                <Tooltip
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as { fullName?: string } | undefined;
                    return p?.fullName ?? "";
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {crossSeries.map((k) => (
                  <Bar key={k} dataKey={k} stackId="fokus" fill={fokusColor(k)} maxBarSize={28} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
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
  const printAreaRef = useRef<HTMLDivElement>(null);

  // OPR didahulukan (lebih penting); Pergerakan kedua.
  const MAIN_TABS: { key: "pergerakan" | "opr"; label: string; accent: string }[] = [
    { key: "opr", label: "OPR", accent: ACCENT_PROGRAM },
    { key: "pergerakan", label: "Pergerakan", accent: ACCENT_PERGERAKAN },
  ];
  const tabLabel = tab === "opr" ? "OPR" : "Pergerakan";

  function onPrint() {
    // Buka semua seksyen supaya carta bersaiz penuh sebelum cetak.
    const area = printAreaRef.current;
    if (area) {
      area.querySelectorAll("details").forEach((d) => {
        d.open = true;
      });
    }
    // Beri masa carta (recharts) untuk ukur semula sebelum window.print().
    setTimeout(() => window.print(), 400);
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

      <div
        className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-slate-200 print:hidden"
        role="tablist"
      >
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
          <button type="button" className="btn-secondary text-sm gap-1.5" onClick={onCsv}>
            <DownloadIcon />
            CSV
          </button>
          <button type="button" className="btn-primary text-sm gap-1.5" onClick={onPrint}>
            <PrinterIcon />
            Cetak PDF
          </button>
        </div>
      </div>

      <div ref={printAreaRef} className="analisis-print-area space-y-3">
        <div className="hidden print:block mb-3">
          <h2 className="text-base font-bold">Analisis {tabLabel} — PPD Manjung</h2>
          <p className="text-xs text-slate-600">Tempoh: {current.periodLabel}</p>
        </div>

        {tab === "pergerakan" ? (
        <div className="space-y-3">
          <AnalisisCollapsible
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
          </AnalisisCollapsible>
        </div>
      ) : (
        <div className="space-y-3">
          <AnalisisCollapsible
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
          </AnalisisCollapsible>

          <AnalisisCollapsible
            title="Analisis fokus"
            count={fokusAggregates.total}
            hint="OPR siap mengikut jenis fokus · lihat fokus paling kerap"
            accentColor={ACCENT_FOKUS}
          >
            <FokusBlock aggregates={fokusAggregates} />
          </AnalisisCollapsible>
        </div>
      )}
      </div>
    </div>
  );
}
