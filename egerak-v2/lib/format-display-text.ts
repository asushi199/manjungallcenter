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

function formatWordCore(core: string, isFirstInSegment: boolean): string {
  if (!core) return core;
  if (core.includes("-")) {
    return core
      .split("-")
      .map((part, i) => formatWordCore(part, isFirstInSegment && i === 0))
      .join("-");
  }
  if (core.length >= 2 && /^[A-Z0-9]+$/.test(core)) return core;
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
 * Normalisasi paparan: trim, ruang tunggal, Title Case BM.
 * Kekalkan singkatan sedia ada (PPD, SK) dan perkataan sambung kecil (di, dan, bin).
 */
export function formatTitleCase(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  return trimmed
    .split(/(\s*[,;]\s*)/)
    .map((part, idx) => (idx % 2 === 1 ? part : formatTitleCaseSegment(part)))
    .join("");
}
