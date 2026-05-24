/** Warna sektor — hex untuk inline style (elak Tailwind purge). */
export type SektorStyle = {
  bg: string;
  border: string;
  text: string;
  chip: string;
};

/** Palet sektor — hue terpisah jelas (elak biru/hijau/cyan yang terlalu hampir). */
export const SEKTOR_STYLE: Record<string, SektorStyle> = {
  PERANCANGAN: { bg: "#fecaca", border: "#dc2626", text: "#7f1d1d", chip: "#dc2626" },
  PENGURUSAN_SEKOLAH: { bg: "#bfdbfe", border: "#2563eb", text: "#1e3a8a", chip: "#2563eb" },
  PEMBANGUNAN_MURID: { bg: "#d9f99d", border: "#65a30d", text: "#365314", chip: "#65a30d" },
  PENTAKSIRAN: { bg: "#fde68a", border: "#d97706", text: "#78350f", chip: "#d97706" },
  PSIKOLOGI_KAUNSELING: { bg: "#e9d5ff", border: "#9333ea", text: "#581c87", chip: "#9333ea" },
  PENGURUSAN: { bg: "#fbcfe8", border: "#db2777", text: "#831843", chip: "#db2777" },
  USTP: { bg: "#c7d2fe", border: "#4f46e5", text: "#312e81", chip: "#4f46e5" },
  PEMBELAJARAN: { bg: "#fed7aa", border: "#ea580c", text: "#7c2d12", chip: "#ea580c" },
};

export const SEKTOR_STYLE_DEFAULT: SektorStyle = {
  bg: "#f1f5f9",
  border: "#94a3b8",
  text: "#0f172a",
  chip: "#94a3b8",
};

export const CUTI_STYLE: SektorStyle = {
  bg: "#a7f3d0",
  border: "#059669",
  text: "#064e3b",
  chip: "#059669",
};

export function sektorStyle(code: string | null | undefined, jenis?: "Pergerakan" | "Bercuti") {
  if (jenis === "Bercuti") return CUTI_STYLE;
  if (!code) return SEKTOR_STYLE_DEFAULT;
  return SEKTOR_STYLE[code] ?? SEKTOR_STYLE_DEFAULT;
}

/** Gaya baris jadual / senarai — padanan dengan PergerakanCard. */
export function sektorRowStyle(
  code: string | null | undefined,
  jenis?: "Pergerakan" | "Bercuti",
): { backgroundColor: string; borderLeft: string } {
  const st = sektorStyle(code, jenis);
  return {
    backgroundColor: st.bg,
    borderLeft: `4px solid ${st.border}`,
  };
}

/** Tailwind classes (untuk komponen yang sudah di-scan). */
export const SEKTOR_COLOR: Record<string, { bg: string; fg: string; chip: string }> = {
  PERANCANGAN: { bg: "bg-red-200", fg: "text-red-900", chip: "bg-red-600" },
  PENGURUSAN_SEKOLAH: { bg: "bg-blue-200", fg: "text-blue-900", chip: "bg-blue-600" },
  PEMBANGUNAN_MURID: { bg: "bg-lime-200", fg: "text-lime-900", chip: "bg-lime-600" },
  PENTAKSIRAN: { bg: "bg-amber-200", fg: "text-amber-900", chip: "bg-amber-600" },
  PSIKOLOGI_KAUNSELING: { bg: "bg-purple-200", fg: "text-purple-900", chip: "bg-purple-600" },
  PENGURUSAN: { bg: "bg-pink-200", fg: "text-pink-900", chip: "bg-pink-600" },
  USTP: { bg: "bg-indigo-200", fg: "text-indigo-900", chip: "bg-indigo-600" },
  PEMBELAJARAN: { bg: "bg-orange-200", fg: "text-orange-900", chip: "bg-orange-600" },
};

export const SEKTOR_COLOR_DEFAULT = {
  bg: "bg-slate-100",
  fg: "text-slate-900",
  chip: "bg-slate-400",
};

export const CUTI_COLOR = { bg: "bg-emerald-200", fg: "text-emerald-900", chip: "bg-emerald-600" };

export function sektorColor(code: string | null | undefined) {
  if (!code) return SEKTOR_COLOR_DEFAULT;
  return SEKTOR_COLOR[code] ?? SEKTOR_COLOR_DEFAULT;
}
