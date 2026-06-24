"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addMonths, format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ms } from "date-fns/locale/ms";
import SektorFilterDropdown from "@/components/SektorFilterDropdown";
import type { SektorOption } from "@/components/FilterBar";
import { cn } from "@/lib/cn";
import { formatDateTime, TZ } from "@/lib/dates";
import { LOKASI_PRESETS } from "@/lib/pergerakan-presets";
import { replaceWithSearchParams } from "@/lib/navigate";
import { sektorStyle } from "@/lib/sektor-colors";
import { sektorShortLabel } from "@/lib/analisis-short-labels";
import {
  compactTakwimTimeLabel,
  groupTakwimItemsByWeek,
  isTakwimUtama,
  normalizeTakwimSearchTerm,
  serializeTakwimSektorParam,
  takwimDisplayKind,
  type TakwimDateGroup,
  type TakwimWeekGroup,
} from "@/lib/takwim-utils";
import { createTakwimTambahan, deleteTakwim, updateTakwim } from "@/lib/actions/takwim";

type SerializedTakwimItem = {
  id: number;
  source: "web" | "bulk";
  takwimKategori: "tambahan" | null;
  jenis: "Pergerakan";
  urusan: string;
  lokasi: string;
  sektorId: number | null;
  sektorCode: string | null;
  sektorName: string | null;
  tarikhPergi: string;
  tarikhKembali: string;
  canManage: boolean;
};

type Props = {
  month: string;
  sektors: SektorOption[];
  selectedSektorIds: number[];
  isAllSectors: boolean;
  hasOwnSektor: boolean;
  showOther: boolean;
  searchTerm: string;
  canCreateTakwim: boolean;
  addSektors: SektorOption[];
  items: SerializedTakwimItem[];
};

function monthDate(month: string) {
  return parseISO(`${month}-01T00:00:00`);
}

function monthLabel(month: string) {
  return format(monthDate(month), "MMMM yyyy", { locale: ms });
}

function dateHeaderLabel(dateKey: string) {
  const date = parseISO(`${dateKey}T00:00:00`);
  return {
    day: format(date, "d", { locale: ms }),
    month: format(date, "MMM", { locale: ms }),
    weekday: format(date, "EEEE", { locale: ms }),
  };
}

function distinctSektorCount(week: TakwimWeekGroup<SerializedTakwimItem>): number {
  const keys = new Set<string>();
  for (const day of week.days) {
    for (const item of day.items) {
      const key = item.sektorCode ?? item.sektorName;
      if (key) keys.add(key);
    }
  }
  return keys.size;
}

function rangeLabel(startDateKey: string, endDateKey: string) {
  const start = parseISO(`${startDateKey}T00:00:00`);
  const end = parseISO(`${endDateKey}T00:00:00`);
  if (startDateKey === endDateKey) return format(start, "d MMM", { locale: ms });
  if (startDateKey.slice(0, 7) === endDateKey.slice(0, 7)) {
    return `${format(start, "d", { locale: ms })} - ${format(end, "d MMM", { locale: ms })}`;
  }
  return `${format(start, "d MMM", { locale: ms })} - ${format(end, "d MMM", { locale: ms })}`;
}

function monthKeyForItem(item: SerializedTakwimItem) {
  return formatInTimeZone(new Date(item.tarikhPergi), TZ, "yyyy-MM");
}

function fullTimeLabel(item: SerializedTakwimItem) {
  const start = new Date(item.tarikhPergi);
  const end = new Date(item.tarikhKembali);
  const sameDay =
    formatInTimeZone(start, TZ, "yyyy-MM-dd") === formatInTimeZone(end, TZ, "yyyy-MM-dd");
  if (sameDay) {
    return `${formatInTimeZone(start, TZ, "HH:mm")} - ${formatInTimeZone(end, TZ, "HH:mm")}`;
  }
  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
}

export default function TakwimClient({
  month,
  sektors,
  selectedSektorIds,
  isAllSectors,
  hasOwnSektor,
  showOther,
  searchTerm,
  canCreateTakwim,
  addSektors,
  items,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchTerm);
  const searchYear = month.slice(0, 4);
  const isSearchMode = searchTerm.length > 0;

  const visibleItems = useMemo(
    () => (showOther ? items : items.filter((it) => isTakwimUtama(it))),
    [items, showOther],
  );
  const weekGroups = useMemo(
    () => groupTakwimItemsByWeek(month, visibleItems),
    [month, visibleItems],
  );
  const monthGroups = useMemo(() => {
    const byMonth = new Map<string, SerializedTakwimItem[]>();
    for (const item of visibleItems) {
      const ym = monthKeyForItem(item);
      const group = byMonth.get(ym) ?? [];
      group.push(item);
      byMonth.set(ym, group);
    }

    return [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, monthItems]) => ({
        month: ym,
        label: monthLabel(ym),
        itemCount: monthItems.length,
        weeks: groupTakwimItemsByWeek(ym, monthItems),
      }));
  }, [visibleItems]);
  const takwimCount = items.filter((it) => isTakwimUtama(it)).length;
  const otherCount = items.filter((it) => takwimDisplayKind(it) === "lain").length;

  const updateUrl = useCallback((patch: {
    month?: string;
    sektorIds?: number[];
    showOther?: boolean;
    search?: string;
  }) => {
    const next = new URLSearchParams(searchParams?.toString());
    next.set("month", patch.month ?? month);
    if (patch.sektorIds) next.set("sektor", serializeTakwimSektorParam(patch.sektorIds));
    if (patch.showOther === true) next.set("lain", "1");
    else if (patch.showOther === false) next.delete("lain");
    if (patch.search != null) {
      const normalized = normalizeTakwimSearchTerm(patch.search);
      if (normalized) next.set("q", normalized);
      else next.delete("q");
    }

    startTransition(() => {
      replaceWithSearchParams(router, "/takwim", next);
    });
  }, [month, router, searchParams, startTransition]);

  useEffect(() => {
    setSearchInput(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    const nextSearch = normalizeTakwimSearchTerm(searchInput);
    if (nextSearch === searchTerm) return;

    const handle = window.setTimeout(() => {
      updateUrl({ search: nextSearch });
    }, 400);

    return () => window.clearTimeout(handle);
  }, [searchInput, searchTerm, updateUrl]);

  function navigateMonth(offset: number) {
    updateUrl({ month: format(addMonths(monthDate(month), offset), "yyyy-MM") });
  }

  const hasNoDefaultSektor = !hasOwnSektor && !isAllSectors && selectedSektorIds.length === 0;

  return (
    <div className="mx-auto max-w-4xl p-3 sm:p-4 space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Takwim Aktiviti Sektor
          </h1>
        </div>
        {canCreateTakwim && (
          <button
            type="button"
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50"
            onClick={() => setFormOpen((v) => !v)}
            disabled={addSektors.length === 0}
          >
            {formOpen ? "Tutup" : "Tambah Takwim"}
          </button>
        )}
      </header>

      {formOpen && canCreateTakwim && <TakwimForm addSektors={addSektors} month={month} />}

      <section className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3 shadow-sm space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
            <button
              type="button"
              className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => navigateMonth(-1)}
              disabled={isPending}
              aria-label="Bulan sebelum"
            >
              &lsaquo;
            </button>
            <span className="min-w-[9.5rem] px-3 py-2 text-center text-sm font-semibold text-slate-800 border-x border-slate-200">
              {monthLabel(month)}
            </span>
            <button
              type="button"
              className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => navigateMonth(1)}
              disabled={isPending}
              aria-label="Bulan seterusnya"
            >
              &rsaquo;
            </button>
          </div>

          <div className="min-w-[13rem] flex-1">
            <SektorFilterDropdown
              sektors={sektors}
              selectedIds={selectedSektorIds}
              onChange={(ids) => updateUrl({ sektorIds: ids })}
              disabled={isPending}
              label="Saring sektor"
              compact
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showOther}
              onChange={(e) => updateUrl({ showOther: e.target.checked })}
              disabled={isPending}
            />
            <span className="whitespace-nowrap">Tunjuk lain-lain</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[14rem] flex-1">
            <label className="sr-only" htmlFor="takwim-search">
              Cari aktiviti
            </label>
            <input
              id="takwim-search"
              type="search"
              className="input h-10"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari aktiviti tahun ini..."
            />
          </div>
          {searchTerm && (
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => {
                setSearchInput("");
                updateUrl({ search: "" });
              }}
              disabled={isPending}
            >
              Kosongkan
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">
            {isSearchMode ? `${visibleItems.length} padanan` : `${takwimCount} takwim`}
          </span>
          <span aria-hidden>·</span>
          <span>{isSearchMode ? `Padanan tahun ${searchYear}` : `${otherCount} lain-lain`}</span>
          {isAllSectors && <span className="badge bg-brand-50 text-brand-700">Semua sektor</span>}
          {isPending && (
            <span className="ml-auto font-medium text-brand-700" role="status">
              Memuatkan...
            </span>
          )}
        </div>
      </section>

      {hasNoDefaultSektor ? (
        <EmptyState
          title="Sektor belum ditetapkan"
          body="Akaun anda belum dikaitkan dengan sektor. Pilih sektor atau semua sektor untuk melihat takwim."
        />
      ) : isSearchMode && monthGroups.length === 0 ? (
        <EmptyState
          title="Tiada aktiviti sepadan"
          body={`Tiada padanan takwim untuk carian "${searchTerm}" dalam tahun ${searchYear}.`}
        />
      ) : !isSearchMode && weekGroups.length === 0 ? (
        <EmptyState
          title="Tiada aktiviti"
          body="Tiada rekod takwim untuk bulan dan sektor yang dipilih."
        />
      ) : isSearchMode ? (
        <div className="space-y-4">
          {monthGroups.map((monthGroup) => (
            <section key={monthGroup.month} className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-2 border-b border-slate-200 pb-1">
                <h2 className="text-base font-semibold text-slate-900">{monthGroup.label}</h2>
                <span className="text-xs text-slate-500">{monthGroup.itemCount} padanan</span>
              </div>
              <div className="space-y-2">
                {monthGroup.weeks.map((week) => (
                  <WeekDetails key={week.weekKey} week={week} defaultOpen addSektors={addSektors} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {weekGroups.map((week) => (
            <WeekDetails key={week.weekKey} week={week} defaultOpen addSektors={addSektors} />
          ))}
        </div>
      )}
    </div>
  );
}

function WeekDetails({
  week,
  defaultOpen,
  addSektors,
}: {
  week: TakwimWeekGroup<SerializedTakwimItem>;
  defaultOpen: boolean;
  addSektors: SektorOption[];
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen, week.weekKey]);

  const sektorCount = distinctSektorCount(week);

  return (
    <details
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2.5 text-sm hover:bg-slate-100">
        <span className="font-bold uppercase tracking-wide text-brand-700">
          Minggu {week.weekNumber}
        </span>
        <span className="font-semibold text-slate-800">
          {rangeLabel(week.startDateKey, week.endDateKey)}
        </span>
        <span className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
            <CalendarIcon />
            {week.itemCount} aktiviti
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
            <GridIcon />
            {sektorCount} sektor
          </span>
          <ChevronIcon
            className={cn("text-slate-400 transition-transform", open && "rotate-180")}
          />
        </span>
      </summary>
      <div className="divide-y divide-slate-100">
        {week.days.map((day) => (
          <DateGroupSection key={day.dateKey} group={day} addSektors={addSektors} />
        ))}
      </div>
    </details>
  );
}

function DateGroupSection({
  group,
  addSektors,
}: {
  group: TakwimDateGroup<SerializedTakwimItem>;
  addSektors: SektorOption[];
}) {
  const header = dateHeaderLabel(group.dateKey);
  return (
    <section className="flex gap-3 px-3 py-3">
      <div className="w-12 shrink-0 text-center">
        <span className="block text-2xl font-bold leading-none text-brand-700">{header.day}</span>
        <span className="mt-0.5 block text-xs font-medium text-slate-500">{header.month}</span>
        <span className="block text-[11px] text-slate-400">{header.weekday}</span>
      </div>
      <div className="min-w-0 flex-1 border-l border-slate-200 pl-3">
        {group.items.map((item) => (
          <AgendaRow
            key={`${item.source}-${item.takwimKategori ?? "none"}-${item.id}`}
            item={item}
            addSektors={addSektors}
          />
        ))}
      </div>
    </section>
  );
}

function AgendaRow({ item, addSektors }: { item: SerializedTakwimItem; addSektors: SektorOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const kind = takwimDisplayKind(item);
  const isTakwim = kind === "rancangan" || kind === "tambahan";
  const canManage = isTakwim && item.canManage;

  function onDelete() {
    if (!window.confirm(`Padam aktiviti "${item.urusan}"? Tindakan ini tidak boleh diundur.`)) {
      return;
    }
    setActionError(null);
    startDelete(async () => {
      const result = await deleteTakwim({ id: item.id });
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }
  const st = sektorStyle(item.sektorCode, item.jenis);
  const sektorFullLabel = item.sektorName ?? item.sektorCode ?? "Tanpa sektor";
  const sektorCompactLabel = sektorShortLabel(item.sektorCode, sektorFullLabel);

  return (
    <article className={cn("relative", !isTakwim && "text-slate-500")}>
      <span
        className="absolute left-[-0.75rem] top-[0.95rem] h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-2 ring-white"
        style={{ backgroundColor: isTakwim ? st.border : "#cbd5e1" }}
        aria-hidden
      />
      <button
        type="button"
        className={cn(
          "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-300",
          !isTakwim && "bg-slate-50/70",
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span
          className={cn(
            "mt-0.5 w-[4.8rem] shrink-0 text-xs font-semibold tabular-nums",
            isTakwim ? "text-brand-700" : "text-slate-400",
          )}
        >
          {compactTakwimTimeLabel(item.tarikhPergi, item.tarikhKembali)}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-sm leading-5",
              isTakwim ? "font-semibold text-slate-900" : "font-medium text-slate-500",
            )}
          >
            {item.urusan}
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: st.chip }}
              aria-hidden
            />
            <span className="truncate" title={sektorFullLabel}>
              <span className="sm:hidden">{sektorCompactLabel}</span>
              <span className="hidden sm:inline">{sektorFullLabel}</span>
            </span>
          </span>
        </span>
        <span
          className={cn(
            "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            kind === "rancangan" && "bg-brand-50 text-brand-700",
            kind === "tambahan" && "bg-emerald-50 text-emerald-700",
            kind === "lain" && "bg-slate-200 text-slate-500",
          )}
        >
          {kind === "rancangan" ? "Rancangan" : kind === "tambahan" ? "Tambahan" : "Lain-lain"}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 pl-4 sm:pl-[5.9rem] text-xs text-slate-500">
          {editing ? (
            <EditTakwimForm
              item={item}
              addSektors={addSektors}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                router.refresh();
              }}
            />
          ) : (
            <div className="space-y-1 rounded-md border border-slate-100 bg-white px-3 py-2">
              <p>
                <span className="font-semibold text-slate-600">Aktiviti:</span>{" "}
                <span className="break-words text-slate-700">{item.urusan}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-600">Masa:</span> {fullTimeLabel(item)}
              </p>
              <p>
                <span className="font-semibold text-slate-600">Lokasi:</span>{" "}
                <span className="break-words">{item.lokasi || "Tiada lokasi"}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-600">Sektor:</span>{" "}
                <span className="break-words">{sektorFullLabel}</span>
              </p>
              {canManage && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    className="rounded-md border border-brand-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                    onClick={() => {
                      setActionError(null);
                      setEditing(true);
                    }}
                    disabled={isDeleting}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    onClick={onDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Memadam..." : "Padam"}
                  </button>
                  {actionError && (
                    <span className="text-xs font-medium text-red-700">{actionError}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function TakwimForm({ addSektors, month }: { addSektors: SektorOption[]; month: string }) {
  const router = useRouter();
  const [isSubmitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const defaultDate = `${month}-01`;

  const lainLainOption = LOKASI_PRESETS[LOKASI_PRESETS.length - 1];
  // Lalai "Dewan Bestari" (preset pertama) — elak salah taip lokasi; pengguna boleh
  // tukar ke Bilik Budiman atau Lain-lain bila perlu.
  const [lokasiSel, setLokasiSel] = useState(LOKASI_PRESETS[0]);
  const [lokasiLain, setLokasiLain] = useState("");
  const isLainLain = lokasiSel === lainLainOption;
  const lokasi = isLainLain ? lokasiLain.trim() : lokasiSel;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      sektorId: Number(form.get("sektorId")),
      urusan: String(form.get("urusan") ?? ""),
      lokasi,
      tarikhPergi: `${String(form.get("tarikhPergiDate") ?? defaultDate)}T${String(
        form.get("tarikhPergiTime") ?? "08:00",
      )}`,
      tarikhKembali: `${String(form.get("tarikhKembaliDate") ?? defaultDate)}T${String(
        form.get("tarikhKembaliTime") ?? "17:00",
      )}`,
    };

    startSubmit(async () => {
      const result = await createTakwimTambahan(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOkMsg(
        result.roomSlotsBooked && result.roomSlotsBooked > 0
          ? `Takwim ditambah; ${result.roomSlotsBooked} slot bilik ditempah.`
          : "Takwim telah ditambah.",
      );
      e.currentTarget.reset();
      setLokasiSel(LOKASI_PRESETS[0]);
      setLokasiLain("");
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-brand-200 bg-brand-50/50 p-3 shadow-sm">
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
        <div className="sm:col-span-2">
          <label className="label">Aktiviti</label>
          <input name="urusan" className="input" required placeholder="Contoh: Mesyuarat Penyelarasan" />
        </div>
        <div>
          <label className="label">Sektor</label>
          <select name="sektorId" className="input" required defaultValue={addSektors[0]?.id ?? ""}>
            {addSektors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Lokasi</label>
          <select
            className="input"
            value={lokasiSel}
            onChange={(e) => setLokasiSel(e.target.value)}
          >
            {LOKASI_PRESETS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          {isLainLain && (
            <input
              className="input mt-2"
              value={lokasiLain}
              onChange={(e) => setLokasiLain(e.target.value)}
              placeholder="Jika ada, taip lokasi"
            />
          )}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div>
            <label className="label">Mula</label>
            <input name="tarikhPergiDate" type="date" className="input" defaultValue={defaultDate} required />
          </div>
          <div>
            <label className="label">Masa</label>
            <input name="tarikhPergiTime" type="time" className="input w-28" defaultValue="08:00" required />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div>
            <label className="label">Tamat</label>
            <input name="tarikhKembaliDate" type="date" className="input" defaultValue={defaultDate} required />
          </div>
          <div>
            <label className="label">Masa</label>
            <input name="tarikhKembaliTime" type="time" className="input w-28" defaultValue="17:00" required />
          </div>
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            disabled={isSubmitting || addSektors.length === 0}
          >
            {isSubmitting ? "Menyimpan..." : "Simpan Takwim"}
          </button>
          {error && <span className="text-sm font-medium text-red-700">{error}</span>}
          {okMsg && <span className="text-sm font-medium text-emerald-700">{okMsg}</span>}
        </div>
      </form>
    </section>
  );
}

function EditTakwimForm({
  item,
  addSektors,
  onCancel,
  onSaved,
}: {
  item: SerializedTakwimItem;
  addSektors: SektorOption[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [isSubmitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const start = new Date(item.tarikhPergi);
  const end = new Date(item.tarikhKembali);
  const startDate = formatInTimeZone(start, TZ, "yyyy-MM-dd");
  const startTime = formatInTimeZone(start, TZ, "HH:mm");
  const endDate = formatInTimeZone(end, TZ, "yyyy-MM-dd");
  const endTime = formatInTimeZone(end, TZ, "HH:mm");

  const sektorOptions = useMemo(() => {
    if (item.sektorId != null && !addSektors.some((s) => s.id === item.sektorId)) {
      return [
        { id: item.sektorId, code: "", name: item.sektorName ?? `Sektor ${item.sektorId}` },
        ...addSektors,
      ];
    }
    return addSektors;
  }, [addSektors, item.sektorId, item.sektorName]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      id: item.id,
      sektorId: Number(form.get("sektorId")),
      urusan: String(form.get("urusan") ?? ""),
      lokasi: String(form.get("lokasi") ?? "").trim(),
      tarikhPergi: `${String(form.get("tarikhPergiDate") ?? startDate)}T${String(
        form.get("tarikhPergiTime") ?? startTime,
      )}`,
      tarikhKembali: `${String(form.get("tarikhKembaliDate") ?? endDate)}T${String(
        form.get("tarikhKembaliTime") ?? endTime,
      )}`,
    };

    startSubmit(async () => {
      const result = await updateTakwim(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <form className="grid gap-3 rounded-md border border-brand-200 bg-brand-50/50 p-3 sm:grid-cols-2" onSubmit={onSubmit}>
      <div className="sm:col-span-2">
        <label className="label">Aktiviti</label>
        <input name="urusan" className="input" required defaultValue={item.urusan} />
      </div>
      <div>
        <label className="label">Sektor</label>
        <select name="sektorId" className="input" required defaultValue={item.sektorId ?? sektorOptions[0]?.id ?? ""}>
          {sektorOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Lokasi</label>
        <input name="lokasi" className="input" defaultValue={item.lokasi} placeholder="Jika ada, taip lokasi" />
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div>
          <label className="label">Mula</label>
          <input name="tarikhPergiDate" type="date" className="input" defaultValue={startDate} required />
        </div>
        <div>
          <label className="label">Masa</label>
          <input name="tarikhPergiTime" type="time" className="input w-28" defaultValue={startTime} required />
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div>
          <label className="label">Tamat</label>
          <input name="tarikhKembaliDate" type="date" className="input" defaultValue={endDate} required />
        </div>
        <div>
          <label className="label">Masa</label>
          <input name="tarikhKembaliTime" type="time" className="input w-28" defaultValue={endTime} required />
        </div>
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Batal
        </button>
        {error && <span className="text-sm font-medium text-red-700">{error}</span>}
      </div>
    </form>
  );
}

function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-8 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </svg>
      </div>
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
    </div>
  );
}
