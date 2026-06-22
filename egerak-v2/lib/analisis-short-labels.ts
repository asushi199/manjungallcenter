const SEKTOR_SHORT_LABELS: Record<string, string> = {
  PERANCANGAN: "SPr",
  PENGURUSAN_SEKOLAH: "SPS",
  PEMBANGUNAN_MURID: "SPM",
  PENTAKSIRAN: "SPP",
  PSIKOLOGI_KAUNSELING: "SPsK",
  PENGURUSAN: "SPg",
  USTP: "USTP",
  PEMBELAJARAN: "SPb",
  PPD_PENTADBIRAN: "PPD",
};

const FOKUS_SHORT_LABELS: Record<string, string> = {
  "Aduan/Siasatan": "AS",
  "Runding Cara/Konsultansi": "RCK",
  Bimbingan: "BIM",
  "Program Sokongan": "PS",
  Perasmian: "RAS",
  Pemantauan: "PMT",
  Mesyuarat: "MSY",
  "Latihan/Taklimat": "LT",
};

const INITIALS_IGNORE = new Set(["dan", "dengan", "di", "ke"]);

function initials(value: string): string {
  const words = value
    .replace(/[()]/g, " ")
    .split(/[\s/_-]+/)
    .map((word) => word.trim())
    .filter((word) => word && !INITIALS_IGNORE.has(word.toLowerCase()))
    .filter((word, index, list) => index === 0 || word.toLowerCase() !== list[index - 1].toLowerCase());

  if (words.length === 0) return "-";
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

export function sektorShortLabel(code: string | null | undefined, name: string): string {
  if (code && SEKTOR_SHORT_LABELS[code]) return SEKTOR_SHORT_LABELS[code];
  return initials(name);
}

export function fokusShortLabel(name: string): string {
  return FOKUS_SHORT_LABELS[name] ?? initials(name);
}
