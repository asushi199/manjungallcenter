import { countToday } from "@/lib/actions/pergerakan";

function TodayStatsIcon() {
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-cyan-500 text-white shadow-sm ring-1 ring-cyan-200/70">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M3 10h18" />
        <path d="M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      </svg>
    </span>
  );
}

export default async function DashboardTodayStats() {
  let today: { total: number; pergerakan: number; bercuti: number } | null = null;
  try {
    today = await countToday();
  } catch (e) {
    console.error("[dashboard] countToday gagal:", e);
  }

  if (!today) {
    return (
      <div className="card p-4">
        <div className="mb-3 flex items-center gap-2">
          <TodayStatsIcon />
          <h2 className="text-sm font-semibold">Pergerakan Hari Ini</h2>
        </div>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
          Statistik tidak dapat dimuatkan. Cuba muat semula sebentar lagi.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <TodayStatsIcon />
        <h2 className="text-sm font-semibold">Pergerakan Hari Ini</h2>
      </div>
      <div className="text-3xl font-bold text-brand-700 leading-none mb-3">
        {today.total}
        <span className="text-base text-slate-500 font-normal"> aktif</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-md bg-pink-50 text-pink-700 py-2">
          <div className="text-xs">Pergerakan</div>
          <div className="font-bold text-lg">{today.pergerakan}</div>
        </div>
        <div className="rounded-md bg-emerald-50 text-emerald-700 py-2">
          <div className="text-xs">Bercuti</div>
          <div className="font-bold text-lg">{today.bercuti}</div>
        </div>
      </div>
    </div>
  );
}
