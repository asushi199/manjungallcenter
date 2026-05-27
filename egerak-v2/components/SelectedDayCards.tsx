"use client";

import { format } from "date-fns";
import type { HolidayDetail } from "@/lib/holidays/types";
import type { CalendarItem } from "@/components/MonthCalendar";
import { sektorStyle } from "@/lib/sektor-colors";
import MinePergerakanCardActions from "@/components/MinePergerakanCardActions";
import CompactExpandableCard, { ClampText } from "@/components/CompactExpandableCard";

function dayTitle(day: string) {
  const d = new Date(day);
  return format(d, "EEEE, dd MMM yyyy");
}

function HolidayCard({ detail }: { detail: HolidayDetail }) {
  const stripe = detail.kind === "sekolah" ? "#f59e0b" : "#fb7185";
  return (
    <CompactExpandableCard
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
    <CompactExpandableCard title={title} subtitle={subtitle} tone="leave" stripeColor={st.border}>
      <ClampText className="text-sm font-medium text-slate-800">{it.urusan}</ClampText>
      {it.lokasi ? <ClampText className="text-xs text-slate-500">{it.lokasi}</ClampText> : null}
    </CompactExpandableCard>
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
  const metaText = `${it.lokasi ? `${it.lokasi} · ` : ""}${format(new Date(it.tarikhPergi), "dd MMM")} – ${format(
    new Date(it.tarikhKembali),
    "dd MMM",
  )}`;

  return (
    <CompactExpandableCard
      title={it.urusan}
      subtitle={subtitle || undefined}
      tone="pergerakan"
      stripeColor={st.border}
      footer={
        isMine ? (
          <MinePergerakanCardActions
            pergerakanId={it.id}
            jenis={it.jenis}
            oprStatus={it.oprStatus ?? null}
          />
        ) : undefined
      }
    >
      <ClampText className="text-[11px] text-slate-500">{metaText}</ClampText>
    </CompactExpandableCard>
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
