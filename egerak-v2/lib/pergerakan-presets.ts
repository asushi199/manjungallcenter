export const LOKASI_PRESETS = [
  "Dewan Bestari",
  "Bilik Budiman",
  "Lain-lain (taip sendiri)",
];

export function resolveLokasiFields(lokasi: string, presets = LOKASI_PRESETS) {
  const lain = presets[presets.length - 1];
  if (presets.includes(lokasi)) return { lokasiSel: lokasi, lokasiLain: "" };
  return { lokasiSel: lain, lokasiLain: lokasi };
}
