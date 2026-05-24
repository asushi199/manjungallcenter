import { countToday } from "@/lib/actions/pergerakan";

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
        <h2 className="text-sm font-semibold mb-2">Pergerakan Hari Ini</h2>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
          Statistik tidak dapat dimuatkan. Sambungan DB mungkin sejuk; sila
          muat semula sebentar lagi.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold mb-2">Pergerakan Hari Ini</h2>
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
