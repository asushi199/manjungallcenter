import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import FilterBar from "@/components/FilterBar";
import MonthCalendar, { type CalendarItem } from "@/components/MonthCalendar";
import PergerakanCard, { type PergerakanCardData } from "@/components/PergerakanCard";
import SektorLegend from "@/components/SektorLegend";
import DashboardScrollSync from "@/components/DashboardScrollSync";
import { listAllSektors } from "@/lib/actions/users";
import { listPergerakanBetween, countToday } from "@/lib/actions/pergerakan";
import { TZ } from "@/lib/dates";
import { requireUser } from "@/lib/rbac";

export const dynamic = "force-dynamic";

type SP = { date?: string; month?: string; sektor?: string; cuti?: string };

function parseDateParam(sp: string | undefined): string {
  const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
  if (!sp || !/^\d{4}-\d{2}-\d{2}$/.test(sp)) return today;
  return sp;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const date = parseDateParam(sp.date);
  const month =
    sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : date.slice(0, 7);
  const sektorIds = (sp.sektor ?? "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
  const includeCuti = sp.cuti === "1";

  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthStart = fromZonedTime(`${month}-01T00:00:00`, TZ);
  const monthEnd = fromZonedTime(
    `${month}-${String(lastDay).padStart(2, "0")}T23:59:59`,
    TZ,
  );
  const dayStart = fromZonedTime(`${date}T00:00:00`, TZ);
  const dayEnd = fromZonedTime(`${date}T23:59:59`, TZ);

  const filter = {
    sektorIds: sektorIds.length ? sektorIds : undefined,
    includeCuti,
  };

  const [sektors, monthItems, dayItems, today] = await Promise.all([
    listAllSektors(),
    listPergerakanBetween({ start: monthStart, end: monthEnd, ...filter }),
    listPergerakanBetween({ start: dayStart, end: dayEnd, ...filter }),
    countToday(),
  ]);

  const toCard = (it: (typeof dayItems)[0]): PergerakanCardData => ({
    id: it.id,
    nama: it.nama,
    jawatan: it.jawatan,
    sektorCode: it.sektorCode,
    sektorName: it.sektorName,
    jenis: it.jenis,
    urusan: it.urusan,
    lokasi: it.lokasi,
    tarikhPergi: it.tarikhPergi.toISOString(),
    tarikhKembali: it.tarikhKembali.toISOString(),
  });

  const calItems: CalendarItem[] = monthItems.map((it) => ({
    id: it.id,
    nama: it.nama,
    jawatan: it.jawatan,
    sektorCode: it.sektorCode,
    sektorName: it.sektorName,
    jenis: it.jenis,
    urusan: it.urusan,
    lokasi: it.lokasi,
    tarikhPergi: it.tarikhPergi.toISOString(),
    tarikhKembali: it.tarikhKembali.toISOString(),
  }));

  const dayLabel = formatInTimeZone(dayStart, TZ, "EEEE, dd MMMM yyyy");

  return (
    <>
      <DashboardScrollSync date={date} />
    <div className="mx-auto max-w-7xl p-4 grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-brand-700 mb-1">Selamat Datang</h2>
          <p className="font-medium">{user.nama}</p>
          <p className="text-xs text-slate-500">{user.jawatan}</p>
          <p className="text-xs text-slate-500">ID: {user.username}</p>
        </div>

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

        <FilterBar
          sektors={sektors.map((s) => ({ id: s.id, code: s.code, name: s.name }))}
          current={{ date, month, sektorIds, includeCuti }}
        />

        <Link className="btn-primary w-full justify-center" href="/new">
          + Isi Pergerakan Baharu
        </Link>
      </aside>

      <section className="space-y-6 min-w-0">
        {/* Kalendar bulan — atas */}
        <div className="space-y-3">
          <header>
            <h1 className="text-lg font-semibold">Kalendar Pergerakan</h1>
            <p className="text-sm text-slate-500">
              {formatInTimeZone(monthStart, TZ, "MMMM yyyy")} · {monthItems.length} rekod · warna
              mengikut sektor · klik hari untuk senarai penuh
            </p>
          </header>
          <MonthCalendar month={month} items={calItems} highlightDate={date} />
          <SektorLegend />
        </div>

        {/* Senarai kad pegawai — bawah */}
        <div className="space-y-3" id="senarai-pergerakan">
          <header className="card px-4 py-3 bg-slate-50 border-b-0 scroll-mt-4">
            <h2 className="text-lg font-semibold text-brand-800">
              Senarai Pergerakan — {dayLabel}
            </h2>
            <p className="text-sm text-slate-500">
              {dayItems.length} rekod
              {includeCuti ? "" : " (cuti tidak dipaparkan)"}
              {sektorIds.length > 0 ? " · sektor ditapis" : " · semua sektor"}
            </p>
          </header>

          {dayItems.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 text-sm">
              Tiada pergerakan pada tarikh ini.
            </div>
          ) : (
            <div className="space-y-2">
              {dayItems.map((it, i) => (
                <PergerakanCard key={it.id} index={i + 1} item={toCard(it)} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
    </>
  );
}
