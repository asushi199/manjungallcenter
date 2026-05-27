"use client";

import { format } from "date-fns";
import { cn } from "@/lib/cn";
import type { HolidayDetail } from "@/lib/holidays/types";
import type { CalendarItem } from "@/components/MonthCalendar";
import { sektorStyle } from "@/lib/sektor-colors";

function dayTitle(day: string) {
  // day is yyyy-MM-dd
  const d = new Date(day);
  return format(d, "EEEE, dd MMM yyyy");
}

function Card({
  title,
  subtitle,
  tone,
  stripeColor,
  children,
}: {
  title: string;
  subtitle?: string;
  tone?: "holiday" | "leave" | "pergerakan";
  stripeColor?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex">
        <div
          className="w-1.5 shrink-0"
          style={{ backgroundColor: stripeColor ?? "#e2e8f0" }}
          aria-hidden
        />
        <div className="p-3 min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 truncate">{title}</div>
              {subtitle ? (
                <div className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</div>
              ) : null}
            </div>
            {tone ? (
              <span
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                  tone === "holiday" && "bg-rose-50 text-rose-800 border-rose-200",
                  tone === "leave" && "bg-emerald-50 text-emerald-800 border-emerald-200",
                  tone === "pergerakan" && "bg-slate-50 text-slate-700 border-slate-200",
                )}
              >
                {tone === "holiday"
                  ? "Cuti"
                  : tone === "leave"
                    ? "Bercuti"
                    : "Pergerakan"}
              </span>
            ) : null}
          </div>
          {children ? <div className="mt-2 text-sm text-slate-700">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

function HolidayCard({ detail }: { detail: HolidayDetail }) {
  const stripe =
    detail.kind === "sekolah" ? "#f59e0b" : "#fb7185"; // amber vs rose
  return (
    <Card
      title={detail.name}
      subtitle={detail.note ?? undefined}
      tone="holiday"
      stripeColor={stripe}
    />
  );
}

function LeaveCard({ it }: { it: CalendarItem }) {
  const st = sektorStyle(it.sektorCode, "Bercuti");
  const title = it.nama ? it.nama : "Bercuti";
  const subtitle = it.jawatan ? it.jawatan : it.sektorName ? it.sektorName : undefined;
  return (
    <Card title={title} subtitle={subtitle} tone="leave" stripeColor={st.border}>
      <div className="text-sm font-medium truncate">{it.urusan}</div>
      {it.lokasi ? <div className="text-xs text-slate-500 truncate mt-0.5">{it.lokasi}</div> : null}
    </Card>
  );
}

function PergerakanCard({ it }: { it: CalendarItem }) {
  const st = sektorStyle(it.sektorCode, "Pergerakan");
  const subtitleParts = [it.sektorName, it.nama].filter(Boolean);
  const subtitle = subtitleParts.join(" · ");
  return (
    <Card title={it.urusan} subtitle={subtitle || undefined} tone="pergerakan" stripeColor={st.border}>
      {it.lokasi ? <div className="text-xs text-slate-500 truncate">{it.lokasi}</div> : null}
      <div className="text-[11px] text-slate-500 mt-1">
        {format(new Date(it.tarikhPergi), "dd MMM")} – {format(new Date(it.tarikhKembali), "dd MMM")}
      </div>
    </Card>
  );
}

export default function SelectedDayCards({
  day,
  items,
  publicHoliday,
  schoolHoliday,
}: {
  day: string;
  items: CalendarItem[];
  publicHoliday?: HolidayDetail;
  schoolHoliday?: HolidayDetail;
}) {
  const bercuti = items.filter((it) => it.jenis === "Bercuti");
  const pergerakan = items.filter((it) => it.jenis === "Pergerakan");

  const hasAny = Boolean(publicHoliday || schoolHoliday || bercuti.length || pergerakan.length);

  return (
    <div className="space-y-2">
      <div className="card p-3">
        <div className="text-xs uppercase tracking-wide text-slate-500">Butiran hari</div>
        <div className="font-semibold text-slate-900">{dayTitle(day)}</div>
      </div>

      {!hasAny ? (
        <div className="card p-4 text-sm text-slate-600">Tiada rekod untuk hari ini.</div>
      ) : (
        <div className="space-y-2">
          {/* Order confirmed: public > school > officer leave > pergerakan */}
          {publicHoliday ? <HolidayCard detail={publicHoliday} /> : null}
          {schoolHoliday ? <HolidayCard detail={schoolHoliday} /> : null}
          {bercuti.map((it) => (
            <LeaveCard key={`bercuti-${it.id}`} it={it} />
          ))}
          {pergerakan.map((it) => (
            <PergerakanCard key={`pergerakan-${it.id}`} it={it} />
          ))}
        </div>
      )}
    </div>
  );
}

