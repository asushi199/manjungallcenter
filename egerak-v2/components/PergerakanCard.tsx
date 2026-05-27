"use client";

import { format } from "date-fns";
import { cn } from "@/lib/cn";
import { oprStatusBadge, type OprStatus } from "@/lib/opr-status";
import { sektorStyle } from "@/lib/sektor-colors";
import MinePergerakanCardActions from "@/components/MinePergerakanCardActions";
import CompactExpandableCard, { ClampText } from "@/components/CompactExpandableCard";

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
  const style = sektorStyle(item.sektorCode, item.jenis);
  const { tarikh, masa } = formatTarikhMasa(item.tarikhPergi, item.tarikhKembali);
  const sektorShort = formatSektorShort(item.sektorCode);
  const oprBadge = item.jenis === "Pergerakan" ? oprStatusBadge(item.oprStatus) : null;

  const title =
    variant === "dashboard" && index != null ? `${index}. ${item.urusan}` : item.urusan;

  const subtitle =
    variant === "dashboard"
      ? [item.sektorName, item.nama].filter(Boolean).join(" · ")
      : item.sektorName ?? undefined;

  const metaText = `${item.lokasi ? `${item.lokasi} · ` : ""}${tarikh} · ${masa}`;

  const trailing = (
    <>
      {variant === "mine" && oprBadge ? (
        <span className={cn("badge text-[10px]", oprBadge.className)}>{oprBadge.label}</span>
      ) : null}
      {sektorShort ? (
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-200 max-w-[10rem] truncate"
          title={item.sektorName ?? sektorShort}
        >
          {sektorShort}
        </span>
      ) : null}
    </>
  );

  const card = (
    <CompactExpandableCard
      title={title}
      subtitle={subtitle}
      tone={item.jenis === "Bercuti" ? "leave" : "pergerakan"}
      stripeColor={style.border}
      trailing={trailing}
      className={cn(variant === "mine" && selected && "ring-2 ring-brand-600 ring-offset-1")}
      footer={
        variant === "mine" ? (
          <MinePergerakanCardActions
            pergerakanId={item.id}
            jenis={item.jenis}
            oprStatus={item.oprStatus}
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
