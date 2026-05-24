import { format } from "date-fns";
import { sektorStyle } from "@/lib/sektor-colors";

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
};

function formatSektorShort(code: string | null) {
  if (!code) return null;
  return code.replace(/_/g, " ");
}

export default function PergerakanCard({
  index,
  item,
}: {
  index: number;
  item: PergerakanCardData;
}) {
  const style = sektorStyle(item.sektorCode, item.jenis);
  const pergi = new Date(item.tarikhPergi);
  const kembali = new Date(item.tarikhKembali);
  const sameDay = format(pergi, "yyyy-MM-dd") === format(kembali, "yyyy-MM-dd");
  const sektorShort = formatSektorShort(item.sektorCode);

  const tarikh =
    sameDay
      ? format(pergi, "d MMM yyyy")
      : `${format(pergi, "d MMM")} – ${format(kembali, "d MMM yyyy")}`;
  const masa = `${format(pergi, "HH:mm")}–${format(kembali, "HH:mm")}`;

  return (
    <article
      className="rounded-lg border border-slate-200/90 bg-white shadow-sm hover:shadow transition-shadow overflow-hidden"
      style={{ borderLeft: `4px solid ${style.border}` }}
    >
      <div className="px-3 py-2.5 flex gap-2.5" style={{ backgroundColor: style.bg }}>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: style.chip }}
          aria-hidden
        >
          {index}
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
            <h3 className="font-semibold text-slate-900 leading-snug min-w-0 flex-1">
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
                  className="rounded border px-1.5 py-0.5 text-[10px] font-medium max-w-[8rem] truncate"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.65)",
                    borderColor: style.border,
                    color: style.text,
                  }}
                  title={item.sektorName ?? sektorShort}
                >
                  {sektorShort}
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-700 leading-snug truncate">
            <span className="font-medium" style={{ color: style.text }}>
              {item.nama}
            </span>
            {item.jawatan ? (
              <span className="text-slate-500"> · {item.jawatan}</span>
            ) : null}
          </p>

          <p className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>{tarikh}</span>
            <span className="text-slate-300" aria-hidden>
              |
            </span>
            <span>{masa}</span>
            {item.lokasi ? (
              <>
                <span className="text-slate-300" aria-hidden>
                  |
                </span>
                <span className="text-slate-700 font-medium truncate max-w-full">
                  {item.lokasi}
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </article>
  );
}
