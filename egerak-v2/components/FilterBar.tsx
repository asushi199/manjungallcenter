"use client";

import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import SektorFilterDropdown from "@/components/SektorFilterDropdown";
import { cn } from "@/lib/cn";
import { replaceWithSearchParams } from "@/lib/navigate";

export type SektorOption = { id: number; code: string; name: string };

/** Tapisan kalendar Utama — sektor & cuti (tarikh/bulan via navigasi kalendar). */
export default function FilterBar({
  sektors,
  current,
  inline = false,
  stacked = false,
  monthControls,
  /** Ikon tetapan dll. — baris pertama stacked (sebelah penapis & cuti) */
  toolbarLeading,
}: {
  sektors: SektorOption[];
  current: {
    date: string;
    month: string;
    sektorIds: number[];
    includeCuti: boolean;
    showSchoolHolidays: boolean;
  };
  /** Satu baris dengan ‹ bulan › (legacy) */
  inline?: boolean;
  /** Baris 1: cuti · Baris 2: sektor + monthControls */
  stacked?: boolean;
  monthControls?: ReactNode;
  toolbarLeading?: ReactNode;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(
    patch: Partial<{
      sektorIds: number[];
      includeCuti: boolean;
      showSchoolHolidays: boolean;
    }>,
  ) {
    const next = new URLSearchParams(params?.toString());
    const date = current.date;
    const month = current.month;
    const sektorIds = patch.sektorIds ?? current.sektorIds;
    const includeCuti = patch.includeCuti ?? current.includeCuti;
    const showSchoolHolidays = patch.showSchoolHolidays ?? current.showSchoolHolidays;

    next.set("date", date);
    next.set("month", month);
    if (sektorIds.length) next.set("sektor", sektorIds.join(","));
    else next.delete("sektor");
    next.set("cuti", includeCuti ? "1" : "0");
    if (showSchoolHolidays) next.delete("sekolah");
    else next.set("sekolah", "0");

    startTransition(() => {
      replaceWithSearchParams(router, "/dashboard", next);
    });
  }

  const cutiPegawaiLabel = (
    <label
      className={cn(
        "flex items-center gap-1.5 text-slate-700 shrink-0 cursor-pointer",
        stacked ? "text-xs" : "text-sm gap-2",
      )}
    >
      <input
        type="checkbox"
        className="shrink-0"
        checked={current.includeCuti}
        onChange={(e) => update({ includeCuti: e.target.checked })}
        disabled={isPending}
      />
      <span className="whitespace-nowrap">Cuti pegawai</span>
    </label>
  );

  const cutiSekolahLabel = (
    <label
      className={cn(
        "flex items-center gap-1.5 text-slate-700 shrink-0 cursor-pointer",
        stacked ? "text-xs" : "text-sm gap-2",
      )}
    >
      <input
        type="checkbox"
        className="shrink-0"
        checked={current.showSchoolHolidays}
        onChange={(e) => update({ showSchoolHolidays: e.target.checked })}
        disabled={isPending}
      />
      <span className="whitespace-nowrap">Cuti sekolah</span>
    </label>
  );

  if (stacked) {
    return (
      <div className="w-full space-y-2 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          {toolbarLeading ? <div className="shrink-0">{toolbarLeading}</div> : null}
          <div className="shrink-0">
            <SektorFilterDropdown
              sektors={sektors}
              selectedIds={current.sektorIds}
              onChange={(sektorIds) => update({ sektorIds })}
              disabled={isPending}
              label="Saring sektor"
              compact
              triggerVariant="icon"
            />
          </div>
          {cutiPegawaiLabel}
          {cutiSekolahLabel}
          {isPending && (
            <span className="text-xs font-medium text-brand-700 ml-auto" role="status">
              Memuatkan…
            </span>
          )}
        </div>
        {monthControls ? (
          <div className="flex flex-wrap items-center justify-end gap-2">{monthControls}</div>
        ) : null}
      </div>
    );
  }

  if (inline) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 min-w-0">
        <label className="flex items-center gap-1.5 text-xs text-slate-700 shrink-0 cursor-pointer">
          <input
            type="checkbox"
            className="shrink-0"
            checked={current.includeCuti}
            onChange={(e) => update({ includeCuti: e.target.checked })}
            disabled={isPending}
          />
          <span className="whitespace-nowrap">Cuti pegawai</span>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-700 shrink-0 cursor-pointer">
          <input
            type="checkbox"
            className="shrink-0"
            checked={current.showSchoolHolidays}
            onChange={(e) => update({ showSchoolHolidays: e.target.checked })}
            disabled={isPending}
          />
          <span className="whitespace-nowrap">Cuti sekolah</span>
        </label>
        <div className="w-[8.5rem] sm:w-[10.5rem] min-w-0 shrink">
          <SektorFilterDropdown
            sektors={sektors}
            selectedIds={current.sektorIds}
            onChange={(sektorIds) => update({ sektorIds })}
            disabled={isPending}
            label="Saring sektor"
            compact
          />
        </div>
        {isPending && (
          <span className="text-[10px] font-medium text-brand-700 whitespace-nowrap" role="status">
            Memuatkan…
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-end px-3 py-2.5">
      {isPending && (
        <p
          className="text-xs font-medium text-brand-700 w-full sm:w-auto sm:ml-auto order-last sm:order-none"
          role="status"
        >
          Memuatkan…
        </p>
      )}
      <div className="flex-1 min-w-[12rem] sm:min-w-[200px]">
        <SektorFilterDropdown
          sektors={sektors}
          selectedIds={current.sektorIds}
          onChange={(sektorIds) => update({ sektorIds })}
          disabled={isPending}
        />
      </div>
      {cutiPegawaiLabel}
      {cutiSekolahLabel}
    </div>
  );
}
