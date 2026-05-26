"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { sektorStyle } from "@/lib/sektor-colors";
import SektorFilterDropdown from "@/components/SektorFilterDropdown";
import type { SektorOption } from "@/components/FilterBar";
import type { AnalisisAggregates } from "@/lib/analisis/cluster-programs";
import type { LaporanOprRange } from "@/lib/laporan-opr-period";
import { replaceWithSearchParams } from "@/lib/navigate";

const BRAND = "#b81049";

const RANGE_OPTIONS: { value: LaporanOprRange; label: string }[] = [
  { value: "year", label: "Tahun" },
  { value: "month", label: "Bulan" },
  { value: "all", label: "Semua tempoh" },
];

type Props = {
  sektors: SektorOption[];
  aggregates: AnalisisAggregates;
  current: {
    range: LaporanOprRange;
    month: string;
    year: string;
    periodLabel: string;
    chartYear: string;
    sektorIds: number[];
  };
};

export default function AnalisisPergerakanClient({
  sektors,
  aggregates,
  current,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

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

  const lineData = aggregates.byMonth.map((m) => ({
    name: m.label,
    count: m.count,
    fullMonth: m.month,
  }));

  const barData = aggregates.bySektor.map((s) => {
    const code = s.code === "—" ? null : s.code;
    return {
      name: s.name.length > 28 ? `${s.name.slice(0, 26)}…` : s.name,
      fullName: s.name,
      count: s.count,
      code,
      fill: sektorStyle(code).chip,
    };
  });

  return (
    <div className="space-y-6">
      <div className="card p-4 flex flex-wrap gap-4 items-end">
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
          <>
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
          </>
        )}

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
      </div>

      <p className="text-sm text-slate-600">
        Tempoh paparan: <strong>{current.periodLabel}</strong>
        {current.range === "month" && (
          <>
            {" "}
            · Carta bulanan = tahun {current.chartYear} (konteks penuh)
          </>
        )}
        {current.range === "all" && " · Carta bulanan = semua tahun (ikut bulan Jan–Dis)"}
      </p>

      <div className="card p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Jumlah program
        </p>
        <p className="text-5xl font-bold text-brand-700 mt-2 tabular-nums">
          {aggregates.totalPrograms}
        </p>
        <p className="text-sm text-slate-500 mt-2">
          daripada <strong>{aggregates.totalRecords}</strong> rekod pergerakan (tanpa
          cuti)
        </p>
        <p className="text-xs text-slate-400 mt-3 max-w-xl mx-auto">
          Satu program = <strong>hari sama</strong> (tarikh pergi) +{" "}
          <strong>lokasi sama</strong> + urusan hampir sama (gabung nama berbeza
          sedikit). Urusan sama tetapi <strong>lokasi berbeza</strong> pada hari
          yang sama dikira <strong>program berasingan</strong> (aktiviti serentak).
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">
            Aktiviti mengikut bulan
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Bilangan program
            {current.range === "all"
              ? " (semua tahun, mengikut bulan kalendar)"
              : ` — ${current.chartYear}`}
          </p>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                <Tooltip
                  formatter={(value: number) => [value, "Program"]}
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
                  <LabelList
                    dataKey="count"
                    position="top"
                    style={{ fontSize: 10, fill: "#64748b" }}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">
            Program mengikut sektor
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Tempoh dipilih (selepas gabung) · warna mengikut sektor (sama seperti kalendar
            Utama)
          </p>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value: number) => [value, "Program"]}
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
    </div>
  );
}
