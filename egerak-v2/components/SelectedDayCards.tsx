"use client";

import { format } from "date-fns";
import { cn } from "@/lib/cn";
import type { HolidayDetail } from "@/lib/holidays/types";
import type { CalendarItem } from "@/components/MonthCalendar";
import { sektorStyle } from "@/lib/sektor-colors";
import MinePergerakanCardActions from "@/components/MinePergerakanCardActions";

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
        <div className="p-2.5 min-w-0 flex-1">
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
          {children ? <div className="mt-1.5 text-sm text-slate-700">{children}</div> : null}
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

function PergerakanCard({
  it,
  isMine,
}: {
  it: CalendarItem;
  isMine: boolean;
}) {
  const st = sektorStyle(it.sektorCode, "Pergerakan");
  const subtitleParts = [it.sektorName, it.nama].filter(Boolean);
  const subtitle = subtitleParts.join(" · ");
  return (
    <Card title={it.urusan} subtitle={subtitle || undefined} tone="pergerakan" stripeColor={st.border}>
      <div className="text-[11px] text-slate-500 truncate">
        {it.lokasi ? (
          <>
            <span className="font-medium text-slate-600">{it.lokasi}</span>
            <span className="text-slate-300"> · </span>
          </>
        ) : null}
        {format(new Date(it.tarikhPergi), "dd MMM")} – {format(new Date(it.tarikhKembali), "dd MMM")}
      </div>
      {isMine ? (
        <div className="mt-2">
          <MinePergerakanCardActions
            pergerakanId={it.id}
            jenis={it.jenis}
            oprStatus={it.oprStatus ?? null}
          />
        </div>
      ) : null}
    </Card>
  );
}

export default function SelectedDayCards({
  day,
  items,
  publicHoliday,
  schoolHoliday,
  currentUserId,
}: {
  day: string;
  items: CalendarItem[];
  publicHoliday?: HolidayDetail;
  schoolHoliday?: HolidayDetail;
  currentUserId: number;
}) {
  const bercuti = items.filter((it) => it.jenis === "Bercuti");
  const pergerakanRaw = items.filter((it) => it.jenis === "Pergerakan");
  const pergerakan = [...pergerakanRaw].sort((a, b) => {
    const am = a.userId === currentUserId ? 0 : 1;
    const bm = b.userId === currentUserId ? 0 : 1;
    if (am !== bm) return am - bm;
    return a.id - b.id;
  });

  const hasAny = Boolean(publicHoliday || schoolHoliday || bercuti.length || pergerakan.length);

  return (
    <div className="space-y-2 max-w-5xl mx-auto">
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
          <div className="space-y-2">
            {bercuti.map((it) => (
              <LeaveCard key={`bercuti-${it.id}`} it={it} />
            ))}
            {pergerakan.map((it) => {
              const isMine = it.userId === currentUserId;
              return <PergerakanCard key={`pergerakan-${it.id}`} it={it} isMine={isMine} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

