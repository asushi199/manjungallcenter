"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import SektorFilterDropdown from "@/components/SektorFilterDropdown";
import { replaceWithSearchParams } from "@/lib/navigate";

export type SektorOption = { id: number; code: string; name: string };

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
      date: string;
      month: string;
      sektorIds: number[];
      includeCuti: boolean;
      showSchoolHolidays: boolean;
    }>,
  ) {
    const next = new URLSearchParams(params?.toString());
    const date = patch.date ?? current.date;
    const month = patch.month ?? current.month;
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

  function onDateChange(date: string) {
    const month = date.slice(0, 7);
    update({ date, month });
  }

  function shiftMonth(delta: number) {
    const [y, m] = current.month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    update({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` });
  }

  return (
    <div className="card p-4 space-y-3">
      {isPending && (
        <p className="text-xs font-medium text-brand-700" role="status">
          Memuatkan…
        </p>
      )}
      <div>
        <label className="label" htmlFor="filter-date">
          Tarikh (senarai kad)
        </label>
        <input
          id="filter-date"
          type="date"
          className="input"
          value={current.date}
          onChange={(e) => onDateChange(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div>
        <label className="label" htmlFor="filter-month">
          Bulan (kalendar)
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => shiftMonth(-1)}
            disabled={isPending}
          >
            {"\u2039"}
          </button>
          <input
            id="filter-month"
            type="month"
            className="input flex-1"
            value={current.month}
            onChange={(e) => update({ month: e.target.value })}
            disabled={isPending}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => shiftMonth(1)}
            disabled={isPending}
          >
            {"\u203A"}
          </button>
        </div>
      </div>

      <SektorFilterDropdown
        sektors={sektors}
        selectedIds={current.sektorIds}
        onChange={(sektorIds) => update({ sektorIds })}
        disabled={isPending}
      />

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={current.includeCuti}
          onChange={(e) => update({ includeCuti: e.target.checked })}
          disabled={isPending}
        />
        Tunjukkan rekod cuti
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-700">
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
