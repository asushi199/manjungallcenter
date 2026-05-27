import { CUTI_STYLE, SEKTOR_STYLE } from "@/lib/sektor-colors";

export default function SektorLegend() {
  const entries = Object.entries(SEKTOR_STYLE);
  return (
    <div>
      <div className="text-xs font-semibold text-slate-600 mb-2">Petunjuk warna sektor</div>
      <div className="flex flex-wrap gap-2">
        {entries.map(([code, s]) => (
          <span
            key={code}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border"
            style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: s.chip }}
            />
            {code.replace(/_/g, " ")}
          </span>
        ))}
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border"
          style={{
            backgroundColor: CUTI_STYLE.bg,
            borderColor: CUTI_STYLE.border,
            color: CUTI_STYLE.text,
          }}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CUTI_STYLE.chip }} />
          Bercuti
        </span>
      </div>
    </div>
  );
}
