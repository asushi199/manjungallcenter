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
import type { CalendarWeekStartsOn } from "@/lib/actions/calendar-settings";
import { requireUser } from "@/lib/rbac";

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
  const session = await requireUser();
  const currentUserId = Number(session.id);
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
    userId: it.userId,
    nama: it.nama,
    jawatan: it.jawatan,
    sektorCode: it.sektorCode,
    sektorName: it.sektorName,
    jenis: it.jenis,
    urusan: it.urusan,
    lokasi: it.lokasi,
    tarikhPergi: it.tarikhPergi.toISOString(),
    tarikhKembali: it.tarikhKembali.toISOString(),
    oprStatus: it.oprStatus,
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
          currentUserId={currentUserId}
          toolbarLeading={
            <CalendarSettingsPanel weekStartsOn={calendarSettings.weekStartsOn as CalendarWeekStartsOn} />
          }
          weekStartsOn={calendarSettings.weekStartsOn as CalendarWeekStartsOn}
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
          <div className="mt-2 space-y-3 text-xs text-slate-600">
            <div className="space-y-1">
              <p>
                <span className="inline-block w-6 h-6 rounded-full bg-slate-500 text-white text-[10px] font-semibold align-middle mr-1" />
                Bulatan kelabu gelap = hari dipilih
              </p>
              <p>
                <span className="inline-block w-6 h-6 rounded-full ring-2 ring-brand-700 text-brand-700 text-[10px] font-semibold align-middle mr-1" />
                Bulatan merah = hari ini
              </p>
              <p>
                <span className="inline-block w-7 h-4 rounded-full bg-brand-700/20 align-middle mr-1" />
                Latar merah lembut = hari ini anda ada aktiviti
              </p>
              <p>
                <span className="inline-block w-7 h-4 rounded-full bg-lime-400/45 align-middle mr-1 border border-lime-500/35" />
                Latar hijau lebih jelas = anda ada aktiviti (akan datang)
              </p>
              <p>
                <span className="inline-block w-7 h-4 rounded-full bg-slate-400/20 align-middle mr-1" />
                Latar kelabu lembut = anda ada aktiviti (telah berlalu)
              </p>
              <p>
                <span className="inline-block w-7 h-4 rounded-full bg-cyan-400/55 align-middle mr-1 border border-cyan-500/40" />
                Latar cyan lebih jelas = ada pergerakan (mana-mana pegawai)
              </p>
              <p>
                <span className="inline-block w-4 h-[2px] rounded-full bg-rose-600 align-middle mr-1" />
                Garis merah pekat = cuti umum (semua orang)
              </p>
              <p>
                <span className="inline-block w-4 h-[2px] rounded-full bg-amber-300 align-middle mr-1" />
                Garis kuning = cuti sekolah sahaja
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200/60">
              <SektorLegend />
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}
