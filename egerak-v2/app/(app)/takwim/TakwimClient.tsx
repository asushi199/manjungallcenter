"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addMonths, format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ms } from "date-fns/locale/ms";
import SektorFilterDropdown from "@/components/SektorFilterDropdown";
import type { SektorOption } from "@/components/FilterBar";
import { cn } from "@/lib/cn";
import { formatDateTime, TZ } from "@/lib/dates";
import { replaceWithSearchParams } from "@/lib/navigate";
import { sektorStyle } from "@/lib/sektor-colors";
import {
  compactTakwimTimeLabel,
  groupTakwimItemsByDate,
  isTakwimUtama,
  serializeTakwimSektorParam,
  takwimDisplayKind,
} from "@/lib/takwim-utils";
import { createTakwimTambahan } from "@/lib/actions/takwim";

type SerializedTakwimItem = {
  id: number;
  source: "web" | "bulk";
  takwimKategori: "tambahan" | null;
  jenis: "Pergerakan";
  urusan: string;
  lokasi: string;
  sektorCode: string | null;
  sektorName: string | null;
  tarikhPergi: string;
  tarikhKembali: string;
};

type Props = {
  month: string;
  sektors: SektorOption[];
  selectedSektorIds: number[];
  isAllSectors: boolean;
  hasOwnSektor: boolean;
  showOther: boolean;
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
    rest: format(date, "MMMM - EEEE", { locale: ms }),
  };
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
  canCreateTakwim,
  addSektors,
  items,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);

  const visibleItems = useMemo(
    () => (showOther ? items : items.filter((it) => isTakwimUtama(it))),
    [items, showOther],
  );
  const groups = useMemo(() => groupTakwimItemsByDate(visibleItems), [visibleItems]);
  const takwimCount = items.filter((it) => isTakwimUtama(it)).length;
  const otherCount = items.filter((it) => takwimDisplayKind(it) === "lain").length;

  function updateUrl(patch: {
    month?: string;
    sektorIds?: number[];
    showOther?: boolean;
  }) {
    const next = new URLSearchParams(searchParams?.toString());
    next.set("month", patch.month ?? month);
    if (patch.sektorIds) next.set("sektor", serializeTakwimSektorParam(patch.sektorIds));
    if (patch.showOther === true) next.set("lain", "1");
    else if (patch.showOther === false) next.delete("lain");

    startTransition(() => {
      replaceWithSearchParams(router, "/takwim", next);
    });
  }

  function navigateMonth(offset: number) {
    updateUrl({ month: format(addMonths(monthDate(month), offset), "yyyy-MM") });
  }

  const hasNoDefaultSektor = !hasOwnSektor && !isAllSectors && selectedSektorIds.length === 0;

  return (
    <div className="mx-auto max-w-4xl p-3 sm:p-4 space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Takwim Aktiviti Sektor
          </h1>
          <p className="text-sm text-slate-500">
            Paparan ringkas aktiviti sektor. Klik aktiviti untuk masa penuh dan lokasi.
          </p>
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

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">
            {takwimCount} takwim
          </span>
          <span aria-hidden>·</span>
          <span>{otherCount} lain-lain</span>
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
      ) : groups.length === 0 ? (
        <EmptyState
          title="Tiada aktiviti"
          body="Tiada rekod takwim untuk bulan dan sektor yang dipilih."
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const header = dateHeaderLabel(group.dateKey);
            return (
              <section key={group.dateKey} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="sticky top-2 z-10 flex items-baseline gap-2 border-b border-slate-100 bg-white/95 px-3 py-2 backdrop-blur">
                  <span className="text-xl font-bold leading-none text-brand-700">
                    {header.day}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">{header.rest}</span>
                  <span className="ml-auto text-xs text-slate-400">
                    {group.items.length} rekod
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {group.items.map((item) => (
                    <AgendaRow key={item.id} item={item} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AgendaRow({ item }: { item: SerializedTakwimItem }) {
  const [open, setOpen] = useState(false);
  const kind = takwimDisplayKind(item);
  const isTakwim = kind === "rancangan" || kind === "tambahan";
  const st = sektorStyle(item.sektorCode, item.jenis);

  return (
    <article className={cn("relative", !isTakwim && "bg-slate-50/70 text-slate-500")}>
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: isTakwim ? st.border : "#cbd5e1" }}
        aria-hidden
      />
      <button
        type="button"
        className="flex w-full items-start gap-2 px-3 py-2.5 pl-4 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-300"
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
            <span className="truncate">{item.sektorName ?? item.sektorCode ?? "Tanpa sektor"}</span>
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
        <div className="px-3 pb-3 pl-[5.9rem] text-xs text-slate-500">
          <div className="rounded-md border border-slate-100 bg-white px-3 py-2">
            <p>
              <span className="font-semibold text-slate-600">Masa:</span> {fullTimeLabel(item)}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-slate-600">Lokasi:</span>{" "}
              {item.lokasi || "Tiada lokasi"}
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

function TakwimForm({ addSektors, month }: { addSektors: SektorOption[]; month: string }) {
  const router = useRouter();
  const [isSubmitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const defaultDate = `${month}-01`;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const form = new FormData(e.currentTarget);
    const payload = {
      sektorId: Number(form.get("sektorId")),
      urusan: String(form.get("urusan") ?? ""),
      lokasi: String(form.get("lokasi") ?? ""),
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
      setOk(true);
      e.currentTarget.reset();
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
          <input name="lokasi" className="input" placeholder="Jika ada" />
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
          {ok && <span className="text-sm font-medium text-emerald-700">Takwim telah ditambah.</span>}
        </div>
      </form>
    </section>
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
