import type { ReactNode } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/cn";
import { oprStatusBadge, type OprStatus } from "@/lib/opr-status";
import { sektorStyle } from "@/lib/sektor-colors";
import MinePergerakanCardActions from "@/components/MinePergerakanCardActions";

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

function MetaLine({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <p className="text-xs text-slate-600 flex gap-1.5 min-w-0">
      <span className="shrink-0 font-semibold text-slate-500 w-[3.25rem]">{label}</span>
      <span className="min-w-0">{children}</span>
    </p>
  );
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

  const subtitle =
    variant === "dashboard"
      ? [item.sektorName, item.nama].filter(Boolean).join(" · ")
      : item.sektorName ?? undefined;

  const metaLine = (
    <div className="text-[11px] text-slate-500 truncate">
      {item.lokasi ? (
        <>
          <span className="font-medium text-slate-600">{item.lokasi}</span>
          <span className="text-slate-300"> · </span>
        </>
      ) : null}
      {tarikh}
      <span className="text-slate-300"> · </span>
      {masa}
    </div>
  );

  const article = (
    <article
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden",
        variant === "dashboard" && "hover:shadow transition-shadow",
        variant === "mine" && selected && "ring-2 ring-brand-600 ring-offset-1",
      )}
    >
      <div className="flex">
        <div
          className="w-1.5 shrink-0"
          style={{ backgroundColor: style.border }}
          aria-hidden
        />
        <div className="p-2.5 min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 truncate">
                {variant === "dashboard" && index != null ? `${index}. ${item.urusan}` : item.urusan}
              </div>
              {subtitle ? <div className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</div> : null}
            </div>
            <div className="flex flex-wrap items-center gap-1 shrink-0">
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
              <span
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                  item.jenis === "Bercuti"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-slate-50 text-slate-700 border-slate-200",
                )}
              >
                {item.jenis === "Bercuti" ? "Bercuti" : "Pergerakan"}
              </span>
            </div>
          </div>

          <div className="mt-1.5">{metaLine}</div>

          {variant === "mine" ? (
            <div className="mt-2">
              <MinePergerakanCardActions
                pergerakanId={item.id}
                jenis={item.jenis}
                oprStatus={item.oprStatus}
              />
            </div>
          ) : null}
        </div>
      </div>
    </article>
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
        <div className="min-w-0 flex-1">{article}</div>
      </div>
    );
  }

  return article;
}
