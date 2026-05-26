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

  const article = (
    <article
      className={cn(
        "rounded-lg border border-slate-200/90 bg-white shadow-sm overflow-hidden transition-shadow",
        variant === "dashboard" && "hover:shadow",
        variant === "mine" && selected && "ring-2 ring-brand-600 ring-offset-1",
      )}
      style={{ borderLeft: `4px solid ${style.border}` }}
    >
      <div className="px-3 py-2.5 space-y-2" style={{ backgroundColor: style.bg }}>
        <div className="flex gap-2.5 items-start">
          {variant === "dashboard" && index != null && (
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: style.chip }}
              aria-hidden
            >
              {index}
            </span>
          )}

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
              <h3 className="font-semibold text-slate-900 leading-snug min-w-0 flex-1 text-[15px]">
                {item.urusan}
              </h3>
              <div className="flex flex-wrap items-center gap-1 shrink-0">
                {item.jenis === "Bercuti" && (
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-emerald-600 text-white">
                    Cuti
                  </span>
                )}
                {sektorShort && (
                  <span
                    className="rounded border px-1.5 py-0.5 text-[10px] font-medium max-w-[9rem] truncate"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.7)",
                      borderColor: style.border,
                      color: style.text,
                    }}
                    title={item.sektorName ?? sektorShort}
                  >
                    {sektorShort}
                  </span>
                )}
                {variant === "mine" && oprBadge && (
                  <span className={cn("badge text-[10px]", oprBadge.className)}>
                    {oprBadge.label}
                  </span>
                )}
              </div>
            </div>

            {variant === "dashboard" ? (
              <>
                <p className="text-sm text-slate-700 leading-snug">
                  <span className="font-medium" style={{ color: style.text }}>
                    {item.nama}
                  </span>
                  {item.jawatan ? (
                    <span className="text-slate-500"> · {item.jawatan}</span>
                  ) : null}
                </p>
                <MetaLine label="Tarikh">
                  <span>
                    {tarikh}
                    <span className="text-slate-400"> · </span>
                    {masa}
                  </span>
                </MetaLine>
                {item.lokasi ? (
                  <MetaLine label="Lokasi">
                    <span className="font-medium text-slate-800">{item.lokasi}</span>
                  </MetaLine>
                ) : null}
              </>
            ) : (
              <>
                {item.lokasi ? (
                  <MetaLine label="Lokasi">
                    <span className="font-medium text-slate-800">{item.lokasi}</span>
                  </MetaLine>
                ) : null}
                {item.sektorName ? (
                  <MetaLine label="Sektor">
                    <span>{item.sektorName}</span>
                  </MetaLine>
                ) : null}
                <MetaLine label="Tarikh">
                  <span>
                    {tarikh}
                    <span className="text-slate-400"> · </span>
                    {masa}
                  </span>
                </MetaLine>
              </>
            )}
          </div>
        </div>

        {variant === "mine" && (
          <MinePergerakanCardActions
            pergerakanId={item.id}
            jenis={item.jenis}
            oprStatus={item.oprStatus}
          />
        )}
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
