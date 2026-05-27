/** Warna tetap untuk sel daftar sendiri (lalu / akan datang) — bukan pilihan pengguna. */
export const CALENDAR_MY_REG_STYLES = {
  pastCellClasses:
    "bg-slate-50/95 ring-2 ring-inset ring-slate-400/75 shadow-[inset_0_-3px_0_0_rgb(100_116_139)]",
  futureCellClasses:
    "bg-emerald-50/55 ring-2 ring-inset ring-emerald-500/60 shadow-[inset_0_-3px_0_0_rgb(16_185_129)]",
  pastLegendClasses:
    "inline-block w-5 h-3 rounded-sm bg-slate-50 ring-2 ring-inset ring-slate-400/75 shadow-[inset_0_-2px_0_0_rgb(100_116_139)] align-middle mr-1",
  futureLegendClasses:
    "inline-block w-5 h-3 rounded-sm bg-emerald-50 ring-2 ring-inset ring-emerald-500/60 shadow-[inset_0_-2px_0_0_rgb(16_185_129)] align-middle mr-1",
} as const;
