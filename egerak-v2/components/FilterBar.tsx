"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import SektorFilterDropdown from "@/components/SektorFilterDropdown";
import { replaceWithSearchParams } from "@/lib/navigate";

export type SektorOption = { id: number; code: string; name: string };

/** Tapisan kalendar Utama — sektor & cuti (tarikh/bulan via klik kalendar). */
export default function FilterBar({
  sektors,
  current,
}: {
  sektors: SektorOption[];
  current: {
    date: string;
    month: string;
    sektorIds: number[];
    includeCuti: boolean;
    showSchoolHolidays: boolean;
  };
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

  return (
    <div className="card p-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      {isPending && (
        <p className="text-xs font-medium text-brand-700 w-full sm:w-auto sm:ml-auto" role="status">
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
      <label className="flex items-center gap-2 text-sm text-slate-700 shrink-0">
        <input
          type="checkbox"
          checked={current.includeCuti}
          onChange={(e) => update({ includeCuti: e.target.checked })}
          disabled={isPending}
        />
        Tunjukkan rekod cuti
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700 shrink-0">
        <input
          type="checkbox"
          checked={current.showSchoolHolidays}
          onChange={(e) => update({ showSchoolHolidays: e.target.checked })}
          disabled={isPending}
        />
        Tunjuk cuti sekolah (KPM)
      </label>
    </div>
  );
}
