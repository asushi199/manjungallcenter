import Link from "next/link";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import type { CalendarItem } from "@/components/MonthCalendar";
import MonthWeekCalendar from "@/components/MonthWeekCalendar";
import { listAllSektors } from "@/lib/actions/users";
import SektorLegend from "@/components/SektorLegend";
import CalendarSettingsPanel from "@/components/CalendarSettingsPanel";
import {
  listPergerakanForDashboard,
  listMyPergerakanDayKeysInMonth,
  type DashboardPergerakanRow,
} from "@/lib/actions/pergerakan";
import { TZ } from "@/lib/dates";
import { getCalendarHolidays, type CalendarHolidays } from "@/lib/holidays";
import { serializeCalendarHolidays } from "@/lib/holidays/serialize";
import { getUserCalendarSettings } from "@/lib/actions/calendar-settings";
import type { CalendarGridOrientation, CalendarWeekStartsOn } from "@/lib/actions/calendar-settings";

export type DashboardMainProps = {
  date: string;
  month: string;
  sektorIds: number[];
  includeCuti: boolean;
  showSchoolHolidays: boolean;
};

const EMPTY_HOLIDAYS: CalendarHolidays = {
  publicLabels: new Map(),
  publicDetails: new Map(),
  schoolLabels: new Map(),
  schoolDetails: new Map(),
};

/** Sekali percubaan semula — cuba pulih dari cold-start Supabase / Vercel function. */
async function fetchPergerakanWithRetry(opts: {
  start: Date;
  end: Date;
  sektorIds?: number[];
  includeCuti?: boolean;
}): Promise<DashboardPergerakanRow[]> {
  try {
    return await listPergerakanForDashboard(opts);
  } catch (e) {
    console.warn("[dashboard] pergerakan attempt 1 failed, retrying", e);
    await new Promise((r) => setTimeout(r, 400));
    return listPergerakanForDashboard(opts);
  }
}

export default async function DashboardMain({
  date,
  month,
  sektorIds,
  includeCuti: _includeCuti,
  showSchoolHolidays: _showSchoolHolidays,
}: DashboardMainProps) {
  const calendarSettings = await getUserCalendarSettings();
  const weekStartsOnValue = calendarSettings.weekStartsOn === "sun" ? 0 : 1;
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthStart = fromZonedTime(`${month}-01T00:00:00`, TZ);
  const monthEnd = fromZonedTime(
    `${month}-${String(lastDay).padStart(2, "0")}T23:59:59`,
    TZ,
  );

  const filter = {
    sektorIds: sektorIds.length ? sektorIds : undefined,
    includeCuti: true,
  };

  const [holidaysRes, pergerakanRes, sektorsRes, myDaysRes] = await Promise.allSettled([
    getCalendarHolidays(month, { showSchoolHolidays: true, weekStartsOn: weekStartsOnValue }),
    fetchPergerakanWithRetry({
      start: monthStart,
      end: monthEnd,
      ...filter,
    }),
    listAllSektors(),
    listMyPergerakanDayKeysInMonth(month),
  ]);

  const filterSektors =
    sektorsRes.status === "fulfilled"
      ? sektorsRes.value.map((s) => ({ id: s.id, code: s.code, name: s.name }))
      : [];
  if (sektorsRes.status === "rejected") {
    console.error("[dashboard] listAllSektors gagal:", sektorsRes.reason);
  }

  const holidays =
    holidaysRes.status === "fulfilled" ? holidaysRes.value : EMPTY_HOLIDAYS;
  if (holidaysRes.status === "rejected") {
    console.error("[dashboard] holidays fetch failed:", holidaysRes.reason);
  }

  const myRegisteredDays =
    myDaysRes.status === "fulfilled" ? myDaysRes.value : [];
  if (myDaysRes.status === "rejected") {
    console.error("[dashboard] my day keys failed:", myDaysRes.reason);
  }

  const monthItems: DashboardPergerakanRow[] =
    pergerakanRes.status === "fulfilled" ? pergerakanRes.value : [];
  const pergerakanFailed = pergerakanRes.status === "rejected";
  if (pergerakanFailed) {
    console.error("[dashboard] pergerakan fetch failed:", pergerakanRes.reason);
  }

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

  const holidayProps = serializeCalendarHolidays(holidays);
  const retryHref = `/dashboard?_r=${Date.now()}`;

  return (
    <section className="space-y-6 min-w-0">
      {pergerakanFailed && (
        <div className="card border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            <strong>Tidak dapat memuatkan rekod pergerakan.</strong> Sambungan
            pangkalan data mungkin sejuk. Cuba muat semula sebentar lagi.
          </p>
          <Link
            href={retryHref}
            className="btn-primary mt-2 inline-flex text-xs"
            prefetch={false}
          >
            Muat semula
          </Link>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Kalendar Pergerakan</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {formatInTimeZone(monthStart, TZ, "MMMM yyyy")} · {monthItems.length} rekod · warna
            mengikut sektor · <strong>klik hari</strong> untuk butiran (kad)
          </p>
        </div>

        <MonthWeekCalendar
          month={month}
          items={calItems}
          highlightDate={date}
          toolbarLeading={
            <CalendarSettingsPanel
              weekStartsOn={calendarSettings.weekStartsOn as CalendarWeekStartsOn}
              gridOrientation={calendarSettings.gridOrientation as CalendarGridOrientation}
            />
          }
          weekStartsOn={calendarSettings.weekStartsOn as CalendarWeekStartsOn}
          gridOrientation={calendarSettings.gridOrientation as CalendarGridOrientation}
          sektors={filterSektors}
          sektorIds={sektorIds}
          publicHolidays={holidayProps.publicLabels}
          publicHolidayDetails={holidayProps.publicDetails}
          schoolHolidays={holidayProps.schoolLabels}
          schoolHolidayDetails={holidayProps.schoolDetails}
          myRegisteredDays={myRegisteredDays ?? []}
        />

        <details className="card p-3">
          <summary className="cursor-pointer select-none text-sm font-semibold text-slate-800">
            Petunjuk (warna / titik)
          </summary>
          <div className="mt-2 space-y-1 text-xs text-slate-600">
            <p>
              <span className="inline-block w-4 h-4 rounded-full ring-2 ring-brand-700 align-middle mr-1" />
              Hari ini = bulatan merah pada tarikh
            </p>
            <p>
              <span className="inline-block w-2 h-2 rounded-full bg-brand-700 align-middle mr-1" />
              Titik merah = hari ini anda ada aktiviti
            </p>
            <p>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 align-middle mr-1" />
              Titik hijau = anda ada aktiviti (akan datang)
            </p>
            <p>
              <span className="inline-block w-2 h-2 rounded-full bg-slate-400 align-middle mr-1" />
              Titik kelabu = anda ada aktiviti (telah berlalu)
            </p>
            <p>
              <span className="inline-block w-2 h-2 rounded-full border-2 border-blue-500 align-middle mr-1" />
              Titik biru (kosong) = ada pergerakan (mana-mana pegawai)
            </p>
            <p>
              <span className="inline-block w-3 h-[2px] rounded bg-yellow-300/80 align-middle mr-1" />
              Garis kuning = cuti (tiada pergerakan)
            </p>
          </div>
        </details>

        <SektorLegend />
      </div>
    </section>
  );
}
