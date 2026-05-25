import Link from "next/link";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import DashboardFilters from "./DashboardFilters";
import MonthCalendar, { type CalendarItem } from "@/components/MonthCalendar";
import SektorLegend from "@/components/SektorLegend";
import {
  listPergerakanForDashboard,
  type DashboardPergerakanRow,
} from "@/lib/actions/pergerakan";
import { TZ } from "@/lib/dates";
import { getCalendarHolidays, type CalendarHolidays } from "@/lib/holidays";
import { serializeCalendarHolidays } from "@/lib/holidays/serialize";

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

  const filter = {
    sektorIds: sektorIds.length ? sektorIds : undefined,
    includeCuti,
  };

  const [holidaysRes, pergerakanRes] = await Promise.allSettled([
    getCalendarHolidays(month, { showSchoolHolidays }),
    fetchPergerakanWithRetry({
      start: monthStart,
      end: monthEnd,
      ...filter,
    }),
  ]);

  const holidays =
    holidaysRes.status === "fulfilled" ? holidaysRes.value : EMPTY_HOLIDAYS;
  if (holidaysRes.status === "rejected") {
    console.error("[dashboard] holidays fetch failed:", holidaysRes.reason);
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
        <MonthCalendar
          month={month}
          items={calItems}
          highlightDate={date}
          header={
            <>
              <h1 className="text-lg font-semibold text-slate-900">Kalendar Pergerakan</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {formatInTimeZone(monthStart, TZ, "MMMM yyyy")} · {monthItems.length} rekod · warna
                mengikut sektor · <strong>klik hari</strong> untuk butiran (laci)
              </p>
            </>
          }
          toolbar={
            <DashboardFilters
              date={date}
              month={month}
              sektorIds={sektorIds}
              includeCuti={includeCuti}
              showSchoolHolidays={showSchoolHolidays}
            />
          }
          publicHolidays={holidayProps.publicLabels}
          publicHolidayDetails={holidayProps.publicDetails}
          schoolHolidays={showSchoolHolidays ? holidayProps.schoolLabels : undefined}
          schoolHolidayDetails={showSchoolHolidays ? holidayProps.schoolDetails : undefined}
        />
        <SektorLegend />
        <div className="text-xs text-slate-500 space-y-1">
          <p>
            <span className="inline-block w-2 h-2 rounded-sm bg-rose-100 border border-rose-300 align-middle mr-1" />
            Merah jambu = cuti umum Perak (data pra-jana — npm run holidays:generate untuk kemas kini)
          </p>
          {showSchoolHolidays && (
            <p>
              <span className="inline-block w-2 h-2 rounded-sm bg-yellow-100 border border-yellow-400 align-middle mr-1" />
              Kuning = cuti sekolah KPM (data tahunan — semak KPM)
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
