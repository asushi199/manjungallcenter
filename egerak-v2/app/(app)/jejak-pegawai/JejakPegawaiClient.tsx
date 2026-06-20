"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { sektorStyle } from "@/lib/sektor-colors";
import { oprStatusBadge } from "@/lib/opr-status";
import { cn } from "@/lib/cn";
import type { PegawaiOption, JejakSummary } from "@/lib/actions/jejak-pegawai";
import { BRAND_THEME_COLOR } from "@/lib/branding";

type SerializedItem = {
  id: number;
  jenis: "Pergerakan" | "Bercuti";
  urusan: string;
  lokasi: string;
  sektorCode: string | null;
  sektorName: string | null;
  tarikhPergi: string;
  tarikhKembali: string;
  oprStatus: "TIADA" | "DRAFT" | "SIAP" | null;
};

type Selected = {
  pegawai: PegawaiOption;
  summary: JejakSummary;
  items: SerializedItem[];
};

type Props = {
  pegawaiList: PegawaiOption[];
  selected: Selected | null;
  selectedId: number | null;
  notFound: boolean;
  year: number | "all";
  currentYear: number;
  canViewAll: boolean;
  lockedSektorName: string | null;
};

function initials(nama: string): string {
  const parts = nama
    .replace(/\b(bin|binti|bt|a\/l|a\/p|dr|hj|hjh|tn|pn|en)\b/gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMMM yyyy");
}

function dateRangeLabel(pergiIso: string, kembaliIso: string) {
  const a = new Date(pergiIso);
  const b = new Date(kembaliIso);
  const sameDay = format(a, "yyyy-MM-dd") === format(b, "yyyy-MM-dd");
  if (sameDay) return format(a, "d MMM yyyy");
  const sameMonth = format(a, "yyyy-MM") === format(b, "yyyy-MM");
  if (sameMonth) return `${format(a, "d")} - ${format(b, "d MMM yyyy")}`;
  return `${format(a, "d MMM")} - ${format(b, "d MMM yyyy")}`;
}

export default function JejakPegawaiClient({
  pegawaiList,
  selected,
  selectedId,
  notFound,
  year,
  currentYear,
  canViewAll,
  lockedSektorName,
}: Props) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredPegawai = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pegawaiList;
    return pegawaiList.filter(
      (p) =>
        p.nama.toLowerCase().includes(q) ||
        (p.jawatan ?? "").toLowerCase().includes(q) ||
        (p.sektorName ?? "").toLowerCase().includes(q),
    );
  }, [pegawaiList, query]);

  function selectPegawai(id: number) {
    setPickerOpen(false);
    setQuery("");
    router.push(`/jejak-pegawai?pegawai=${id}&year=${year}`);
  }

  function openPicker() {
    setPickerOpen(true);
    setTimeout(() => searchRef.current?.focus(), 30);
  }

  function navigateYear(y: number | "all") {
    if (!selectedId) return;
    router.push(`/jejak-pegawai?pegawai=${selectedId}&year=${y}`);
  }

  const grouped = useMemo(() => {
    if (!selected) return [];
    const byMonth = new Map<string, SerializedItem[]>();
    for (const it of selected.items) {
      const ym = format(new Date(it.tarikhPergi), "yyyy-MM");
      const list = byMonth.get(ym) ?? [];
      list.push(it);
      byMonth.set(ym, list);
    }
    return [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [selected]);

  const prevYear = year === "all" ? currentYear - 1 : year - 1;
  const nextYear = year === "all" ? currentYear + 1 : year + 1;
  const headStyle = selected ? sektorStyle(selected.pegawai.sektorCode) : null;

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Jejak Pergerakan Pegawai
        </h1>
        <p className="text-sm text-slate-500">
          Pilih seorang pegawai untuk melihat sejarah pergerakan dan status OPR mereka.
        </p>
        {!canViewAll && lockedSektorName && (
          <p className="inline-flex items-center gap-1.5 mt-1 text-xs font-medium text-brand-800 bg-brand-50 border border-brand-200 rounded-full px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />
            Skop sektor: {lockedSektorName}
          </p>
        )}
        {!canViewAll && !lockedSektorName && (
          <p className="mt-1 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Akaun anda belum dikaitkan dengan sektor. Hubungi pentadbir.
          </p>
        )}
      </header>

      <div className="card p-3 sm:p-4">
        <label className="label">Pegawai</label>
        <button
          type="button"
          onClick={openPicker}
          className="w-full flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left hover:border-brand-400 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          {selected ? (
            <>
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow-sm"
                style={{ backgroundColor: sektorStyle(selected.pegawai.sektorCode).chip }}
              >
                {initials(selected.pegawai.nama)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900 truncate">
                  {selected.pegawai.nama}
                </span>
                <span className="block text-xs text-slate-500 truncate">
                  {selected.pegawai.jawatan || "-"}
                  {selected.pegawai.sektorName ? ` | ${selected.pegawai.sektorName}` : ""}
                </span>
              </span>
            </>
          ) : (
            <span className="flex-1 text-slate-400">
              {pegawaiList.length === 0 ? "Tiada pegawai dalam skop anda" : "Pilih pegawai..."}
            </span>
          )}
          <span className="shrink-0 text-slate-400" aria-hidden>
            v
          </span>
        </button>
      </div>

      {!selectedId && !notFound && (
        <div className="card p-10 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-500">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <p className="font-medium text-slate-700">Belum ada pegawai dipilih</p>
          <p className="text-sm text-slate-500 mt-0.5">
            Gunakan pemilih di atas untuk mula menjejak.
          </p>
        </div>
      )}

      {notFound && (
        <div className="card p-8 text-center text-sm text-slate-600">
          Rekod pegawai tidak dijumpai atau di luar skop kebenaran anda.
        </div>
      )}

      {selected && headStyle && (
        <div className="space-y-4">
          <section
            className="relative overflow-hidden rounded-xl border bg-white shadow-sm"
            style={{ borderColor: headStyle.border }}
          >
            <span
              className="absolute inset-y-0 left-0 w-1.5"
              style={{ backgroundColor: headStyle.border }}
              aria-hidden
            />
            <div className="flex items-center gap-4 p-4 sm:p-5 pl-6">
              <span
                className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-bold text-white shadow"
                style={{ backgroundColor: headStyle.chip }}
              >
                {initials(selected.pegawai.nama)}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900 leading-tight truncate">
                  {selected.pegawai.nama}
                </h2>
                <p className="text-sm text-slate-600 truncate">
                  {selected.pegawai.jawatan || "-"}
                </p>
                {selected.pegawai.sektorName && (
                  <span
                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: headStyle.bg,
                      color: headStyle.text,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: headStyle.chip }}
                      aria-hidden
                    />
                    {selected.pegawai.sektorName}
                  </span>
                )}
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 border-r border-slate-200"
                onClick={() => navigateYear(prevYear)}
                aria-label="Tahun sebelum"
              >
                &lt;
              </button>
              <span className="px-3 py-1.5 text-sm font-semibold text-slate-800 min-w-[6rem] text-center">
                {year === "all" ? "Semua tahun" : year}
              </span>
              <button
                type="button"
                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 border-l border-slate-200 disabled:opacity-40"
                onClick={() => navigateYear(nextYear)}
                disabled={year !== "all" && year >= currentYear}
                aria-label="Tahun seterusnya"
              >
                &gt;
              </button>
            </div>
            <button
              type="button"
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                year === "all"
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
              )}
              onClick={() => navigateYear("all")}
            >
              Semua
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile
              label="Pergerakan"
              value={selected.summary.pergerakan}
              accent={BRAND_THEME_COLOR}
              tint="#effaf9"
            />
            <StatTile
              label="OPR Siap"
              value={selected.summary.oprSiap}
              accent="#059669"
              tint="#ecfdf5"
            />
            <StatTile
              label="OPR Draf"
              value={selected.summary.oprDraf}
              accent="#d97706"
              tint="#fffbeb"
            />
            <StatTile
              label="Perlu Tindakan"
              value={selected.summary.oprPerluTindakan}
              accent="#dc2626"
              tint="#fef2f2"
            />
            <StatTile
              label="Bercuti"
              value={selected.summary.bercuti}
              accent="#0d9488"
              tint="#f0fdfa"
            />
          </div>

          {selected.items.length === 0 ? (
            <div className="card p-10 text-center text-slate-500">
              Tiada rekod pergerakan untuk {year === "all" ? "mana-mana tahun" : year}.
            </div>
          ) : (
            <div className="space-y-5">
              {grouped.map(([ym, monthItems]) => (
                <section key={ym}>
                  <div className="flex items-baseline gap-2 mb-2 px-1">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                      {monthLabel(ym)}
                    </h3>
                    <span className="text-xs text-slate-400">{monthItems.length} rekod</span>
                  </div>
                  <ol className="relative space-y-2.5 before:absolute before:left-[7px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-slate-200">
                    {monthItems.map((it) => {
                      const st = sektorStyle(it.sektorCode, it.jenis);
                      const badge = oprStatusBadge(it.oprStatus ?? undefined);
                      return (
                        <li key={it.id} className="relative pl-6">
                          <span
                            className="absolute left-0 top-3 grid h-3.5 w-3.5 place-items-center rounded-full ring-2 ring-white"
                            style={{ backgroundColor: st.chip }}
                            aria-hidden
                          />
                          <article
                            className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                            style={{ borderLeft: `4px solid ${st.border}` }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                                    {dateRangeLabel(it.tarikhPergi, it.tarikhKembali)}
                                  </span>
                                  {it.jenis === "Bercuti" && (
                                    <span
                                      className="badge"
                                      style={{ backgroundColor: st.bg, color: st.text }}
                                    >
                                      Bercuti
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 font-medium text-slate-900 break-words">
                                  {it.urusan}
                                </p>
                                {it.lokasi && (
                                  <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500">
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      className="mt-0.5 shrink-0"
                                      aria-hidden
                                    >
                                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                      <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    <span className="break-words">{it.lokasi}</span>
                                  </p>
                                )}
                              </div>
                              {it.jenis === "Pergerakan" && (
                                <span className="shrink-0">
                                  {badge ? (
                                    <span className={`badge ${badge.className}`}>
                                      {badge.label}
                                    </span>
                                  ) : (
                                    <span className="badge bg-slate-100 text-slate-500">
                                      Belum OPR
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </article>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh]">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Tutup"
            onClick={() => setPickerOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="border-b border-slate-100 p-3">
              <input
                ref={searchRef}
                className="input"
                placeholder="Cari nama / jawatan / sektor..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <ul className="max-h-[50vh] overflow-y-auto py-1">
              {filteredPegawai.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-slate-400">
                  Tiada pegawai sepadan.
                </li>
              ) : (
                filteredPegawai.map((p) => {
                  const st = sektorStyle(p.sektorCode);
                  const active = p.id === selectedId;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => selectPegawai(p.id)}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors",
                          active && "bg-brand-50",
                        )}
                      >
                        <span
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: st.chip }}
                        >
                          {initials(p.nama)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-900 truncate">
                            {p.nama}
                          </span>
                          <span className="block text-xs text-slate-500 truncate">
                            {p.jawatan || "-"}
                            {p.sektorName ? ` | ${p.sektorName}` : ""}
                          </span>
                        </span>
                        {active && (
                          <span className="shrink-0 text-brand-600" aria-hidden>
                            OK
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
  tint,
}: {
  label: string;
  value: number;
  accent: string;
  tint: string;
}) {
  return (
    <div
      className="rounded-xl border bg-white p-3 transition-transform hover:-translate-y-0.5"
      style={{ borderColor: `${accent}33` }}
    >
      <div className="flex items-center gap-2">
        <span
          className="grid h-7 w-7 place-items-center rounded-lg text-sm font-bold"
          style={{ backgroundColor: tint, color: accent }}
        >
          {value}
        </span>
        <span className="text-xs font-medium text-slate-500 leading-tight">{label}</span>
      </div>
    </div>
  );
}
