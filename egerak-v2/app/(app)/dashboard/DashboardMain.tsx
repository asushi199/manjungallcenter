import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import MonthCalendar, { type CalendarItem } from "@/components/MonthCalendar";
import PergerakanCard, { type PergerakanCardData } from "@/components/PergerakanCard";
import SektorLegend from "@/components/SektorLegend";
import { listPergerakanForDashboard } from "@/lib/actions/pergerakan";
import { TZ } from "@/lib/dates";
import { getCalendarHolidays } from "@/lib/holidays";
import { pergerakanOverlapsRange } from "@/lib/pergerakan-filter";

export type DashboardMainProps = {
  date: string;
  month: string;
  sektorIds: number[];
  includeCuti: boolean;
  showSchoolHolidays: boolean;
};

export default async function DashboardMain({
  date,
  month,
  sektorIds,
  includeCuti,
  showSchoolHolidays,
}: DashboardMainProps) {
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

  const [holidays, monthItems] = await Promise.all([
    getCalendarHolidays(month, { showSchoolHolidays }),
    listPergerakanForDashboard({
      start: monthStart,
      end: monthEnd,
      ...filter,
    }),
  ]);

  const dayItems = monthItems.filter((it) =>
    pergerakanOverlapsRange(it.tarikhPergi, it.tarikhKembali, dayStart, dayEnd),
  );

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
    <section className="space-y-6 min-w-0">
      <div className="space-y-3">
        <header>
          <h1 className="text-lg font-semibold">Kalendar Pergerakan</h1>
          <p className="text-sm text-slate-500">
            {formatInTimeZone(monthStart, TZ, "MMMM yyyy")} · {monthItems.length} rekod · warna
            mengikut sektor · klik hari untuk butiran (laci)
          </p>
        </header>
        <MonthCalendar
          month={month}
          items={calItems}
          highlightDate={date}
          publicHolidays={holidays.publicLabels}
          publicHolidayDetails={holidays.publicDetails}
          schoolHolidays={showSchoolHolidays ? holidays.schoolLabels : undefined}
          schoolHolidayDetails={showSchoolHolidays ? holidays.schoolDetails : undefined}
        />
        <SektorLegend />
        <div className="text-xs text-slate-500 space-y-1">
          <p>
            <span className="inline-block w-2 h-2 rounded-sm bg-rose-100 border border-rose-300 align-middle mr-1" />
            Merah jambu = cuti umum Perak (auto dikemas kini mingguan)
          </p>
          {showSchoolHolidays && (
            <p>
              <span className="inline-block w-2 h-2 rounded-sm bg-yellow-100 border border-yellow-400 align-middle mr-1" />
              Kuning = cuti sekolah KPM (data tahunan — semak KPM)
            </p>
          )}
        </div>
      </div>

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
  );
}
