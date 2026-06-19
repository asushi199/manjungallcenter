/** Perkataan kecil dalam tajuk BM / nama (bukan perkataan pertama segmen). */
const LOWERCASE_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "al",
  "atau",
  "atas",
  "bawah",
  "bin",
  "binti",
  "dan",
  "dari",
  "dengan",
  "di",
  "dalam",
  "for",
  "in",
  "ke",
  "of",
  "on",
  "or",
  "pada",
  "the",
  "to",
  "untuk",
  "van",
  "de",
]);

/**
 * Singkatan yang dikekalkan huruf besar walaupun ditaip dalam apa-apa kes.
 * Tujuan: "PEGAWAI USTP" → "Pegawai USTP", "SK PANGKALAN BAHARU" → "SK Pangkalan Baharu".
 * Tambah singkatan baharu di sini bila perlu.
 */
const ACRONYMS = new Set([
  // Jenis sekolah
  "SK", "SJK", "SJKC", "SJKT", "SMK", "SMJK", "SABK", "SBP", "SBPI", "SMKA",
  "MRSM", "KAFA", "SR", "SM", "SRA",
  // Badan / pejabat
  "PPD", "PPDM", "JPN", "KPM", "KPT", "BTP", "BPSH", "BPG", "IPG", "IPGM", "IAB", "BPK", "JKR",
  // Teknologi / program
  "USTP", "ICT", "ICTL", "PSS", "VLE", "LMS", "OPR", "KPI", "SISPA", "NILAM",
  "PBD", "PLC", "HEM", "TMK", "RBT", "PJK", "MBMMBI", "AI", "RPM", "LADAP",
  // Peperiksaan / penilaian
  "UPSR", "PT3", "SPM", "STPM", "STAM", "UASA", "PAT", "PKSR", "PBPPP",
  // Jawatan / unit / gred staf
  "GB", "PGB", "PK", "PKP", "PKHEM", "PKKK", "GKMP", "SU", "AJK", "YDP", "NYDP",
  "GPK", "TYT", "KP", "OKU", "PIBG", "RMT", "PT", "PO", "PPP", "PPPS", "PPPLD",
  "JUSA", "AKP", "PPPB",
  // Lain-lain
  "MC", "MCP",
]);

/** Singkatan dengan kes khas (jenama rasmi) — dipaparkan mengikut ejaan rasmi. */
const CANONICAL = new Map<string, string>([
  ["DELIMA", "DELIMa"],
  ["PDP", "PdP"],
  ["PAK21", "PAK21"],
  ["EGERAK", "eGerak"],
  ["NOTEBOOKLM", "NotebookLM"],
]);

function formatWordCore(core: string, isFirstInSegment: boolean): string {
  if (!core) return core;
  if (core.includes("-")) {
    return core
      .split("-")
      .map((part, i) => formatWordCore(part, isFirstInSegment && i === 0))
      .join("-");
  }
  const upper = core.toUpperCase();
  // Singkatan dikenali — kekalkan huruf besar (atau ejaan rasmi).
  if (CANONICAL.has(upper)) return CANONICAL.get(upper)!;
  if (ACRONYMS.has(upper)) return upper;
  // Kod alfanumerik pendek (cth PT3, KP1, 5S) — kekalkan huruf besar.
  if (core.length <= 6 && /[0-9]/.test(core) && /^[A-Za-z0-9]+$/.test(core)) return upper;
  const lower = core.toLowerCase();
  if (!isFirstInSegment && LOWERCASE_WORDS.has(lower)) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function formatWordToken(word: string, isFirstInSegment: boolean): string {
  const m = word.match(/^(\W*)([\w-]+)(\W*)$/);
  if (!m) return word;
  const [, pre, core, post] = m;
  if (!core) return word;
  return pre + formatWordCore(core, isFirstInSegment) + post;
}

function formatTitleCaseSegment(segment: string): string {
  const trimmed = segment.trim();
  if (!trimmed) return trimmed;
  const words = trimmed.split(/\s+/);
  return words.map((w, i) => formatWordToken(w, i === 0)).join(" ");
}

/**
 * Normalisasi paparan: trim, ruang tunggal, Title Case BM (setiap perkataan
 * bermula huruf besar). Singkatan dalam senarai ACRONYMS dikekalkan huruf besar
 * (USTP, SK, SISPA…); perkataan sambung kecil (di, dan, bin) kekal huruf kecil.
 */
export function formatTitleCase(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  return trimmed
    .split(/(\s*[,;]\s*)/)
    .map((part, idx) => (idx % 2 === 1 ? part : formatTitleCaseSegment(part)))
    .join("");
}
