/** Normalisasi teks untuk perbandingan urusan / lokasi. */
export function normalizeText(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

/** Levenshtein distance (ringan, tiada dependency). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/** Skor persamaan 0..1 (1 = sama). */
export function textSimilarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return na === nb ? 1 : 0;
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - dist / maxLen;
}

const SIMILARITY_THRESHOLD = 0.88;
const SUBSTRING_LEN_DIFF_MAX = 3;

/** Sama program jika urusan hampir sama (1–2 aksara berbeza, dll.). */
export function urusanMatches(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return na === nb;
  if (na === nb) return true;

  if (textSimilarity(a, b) >= SIMILARITY_THRESHOLD) return true;

  const short = na.length <= nb.length ? na : nb;
  const long = na.length <= nb.length ? nb : na;
  if (long.includes(short) && long.length - short.length <= SUBSTRING_LEN_DIFF_MAX) {
    return true;
  }

  return false;
}

export function normalizeLokasi(lokasi: string): string {
  return normalizeText(lokasi || "");
}
