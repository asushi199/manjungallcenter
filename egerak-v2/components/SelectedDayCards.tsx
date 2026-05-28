"use client";

import { format } from "date-fns";
import type { HolidayDetail } from "@/lib/holidays/types";
import type { CalendarItem } from "@/components/MonthCalendar";
import { sektorStyle } from "@/lib/sektor-colors";
import MinePergerakanCardActions from "@/components/MinePergerakanCardActions";
import CompactExpandableCard, { ClampText } from "@/components/CompactExpandableCard";
import Link from "next/link";

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
  const pergi = new Date(it.tarikhPergi);
  const kembali = new Date(it.tarikhKembali);
  const sameDay = format(pergi, "yyyy-MM-dd") === format(kembali, "yyyy-MM-dd");
  const tarikh = sameDay
    ? format(pergi, "dd MMM yyyy")
    : `${format(pergi, "dd MMM")} – ${format(kembali, "dd MMM yyyy")}`;
  return (
    <CompactExpandableCard title={title} subtitle={subtitle} tone="leave" stripeColor={st.border}>
      <ClampText className="text-sm font-medium text-slate-800">{it.urusan}</ClampText>
      <ClampText className="text-[11px] text-slate-500">{tarikh}</ClampText>
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
  const subtitleParts = isMine ? [] : [it.nama, it.sektorName].filter(Boolean);
  const subtitle = subtitleParts.join(" · ");
  const pergi = new Date(it.tarikhPergi);
  const kembali = new Date(it.tarikhKembali);
  const sameDay = format(pergi, "yyyy-MM-dd") === format(kembali, "yyyy-MM-dd");
  const tarikh = sameDay
    ? format(pergi, "dd MMM yyyy")
    : `${format(pergi, "dd MMM")} – ${format(kembali, "dd MMM yyyy")}`;
  const masa = `${format(pergi, "HH:mm")} – ${format(kembali, "HH:mm")}`;
  const metaText = `${it.lokasi ? `${it.lokasi} · ` : ""}${tarikh} · ${masa}`;

  return (
    <CompactExpandableCard
      title={it.urusan}
      subtitle={subtitle || undefined}
      tone="pergerakan"
      stripeColor={st.border}
      className={isMine ? "border-brand-300 ring-1 ring-brand-100" : undefined}
      trailing={
        isMine ? (
          <Link
            href={`/my/${it.id}/edit`}
            className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            aria-label="Edit rekod"
            data-no-toggle
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </Link>
        ) : undefined
      }
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
