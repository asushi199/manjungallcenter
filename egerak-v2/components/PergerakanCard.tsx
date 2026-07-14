"use client";

import { format } from "date-fns";
import { cn } from "@/lib/cn";
import { oprStatusIndicator, type OprStatus } from "@/lib/opr-status";
import { sektorStyle } from "@/lib/sektor-colors";
import MinePergerakanCardActions from "@/components/MinePergerakanCardActions";
import CompactExpandableCard, { ClampText } from "@/components/CompactExpandableCard";
import Link from "next/link";

export type PergerakanCardData = {
  id: number;
  nama: string;
  jawatan: string;
  sektorCode: string | null;
  sektorName: string | null;
  jenis: "Pergerakan" | "Bercuti";
  urusan: string;
  lokasi: string;
  tarikhPergi: string;
  tarikhKembali: string;
  oprStatus?: OprStatus | null;
};

function formatSektorShort(code: string | null) {
  if (!code) return null;
  return code.replace(/_/g, " ");
}

function formatTarikhMasa(tarikhPergi: string, tarikhKembali: string) {
  const pergi = new Date(tarikhPergi);
  const kembali = new Date(tarikhKembali);
  const sameDay = format(pergi, "yyyy-MM-dd") === format(kembali, "yyyy-MM-dd");
  const tarikh = sameDay
    ? format(pergi, "d MMM yyyy")
    : `${format(pergi, "d MMM")} – ${format(kembali, "d MMM yyyy")}`;
  const masa = `${format(pergi, "HH:mm")} – ${format(kembali, "HH:mm")}`;
  return { tarikh, masa, sameDay };
}

type Props = {
  item: PergerakanCardData;
  /** Utama: siapa + urusan; Saya: urusan + tindakan OPR */
  variant: "dashboard" | "mine";
  /** Nombor dalam senarai hari (Utama) */
  index?: number;
  selected?: boolean;
  onToggleSelect?: () => void;
};

export default function PergerakanCard({
  item,
  variant,
  index,
  selected,
  onToggleSelect,
}: Props) {
  const isMine = variant === "mine";
  const style = sektorStyle(item.sektorCode, item.jenis);
  const { tarikh, masa } = formatTarikhMasa(item.tarikhPergi, item.tarikhKembali);
  const sektorShort = formatSektorShort(item.sektorCode);
  const oprIndicator = isMine ? oprStatusIndicator(item.jenis, item.oprStatus) : null;

  const title =
    variant === "dashboard" && index != null ? `${index}. ${item.urusan}` : item.urusan;

  const subtitle =
    variant === "dashboard"
      ? [item.nama, item.sektorName].filter(Boolean).join(" · ")
      : undefined;

  const metaText = `${item.lokasi ? `${item.lokasi} · ` : ""}${tarikh} · ${masa}`;

  const sektorChip = sektorShort ? (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-200 max-w-[10rem] truncate"
      title={item.sektorName ?? sektorShort}
    >
      {sektorShort}
    </span>
  ) : null;

  const editLink = (
    <Link
      href={`/my/${item.id}/edit?from=${encodeURIComponent("/my")}`}
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
  );

  // Saya: status OPR (kiri) + sektor & edit (kanan) pada baris di bawah tajuk.
  const trailing = isMine ? (
    <div className="flex w-full items-center gap-2">
      {oprIndicator ? (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
          <span className={cn("size-1.5 shrink-0 rounded-full", oprIndicator.dotClass)} aria-hidden />
          {oprIndicator.label}
        </span>
      ) : null}
      <div className="ml-auto flex items-center gap-1.5">
        {sektorChip}
        {editLink}
      </div>
    </div>
  ) : (
    sektorChip
  );

  const card = (
    <CompactExpandableCard
      title={title}
      subtitle={subtitle}
      tone={item.jenis === "Bercuti" ? "leave" : isMine ? undefined : "pergerakan"}
      stripeColor={style.border}
      trailing={trailing}
      headerLayout={isMine ? "stack" : "inline"}
      className={cn(isMine && selected && "ring-2 ring-brand-600 ring-offset-1")}
      footer={
        variant === "mine" ? (
          <MinePergerakanCardActions
            pergerakanId={item.id}
            jenis={item.jenis}
            oprStatus={item.oprStatus}
            backTo="/my"
          />
        ) : undefined
      }
    >
      <ClampText className="text-[11px] text-slate-500">{metaText}</ClampText>
    </CompactExpandableCard>
  );

  if (variant === "mine" && onToggleSelect) {
    return (
      <div className="flex gap-2.5 items-start">
        <input
          type="checkbox"
          className="mt-3 shrink-0"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`Pilih ${item.urusan}`}
        />
        <div className="min-w-0 flex-1">{card}</div>
      </div>
    );
  }

  return card;
}
