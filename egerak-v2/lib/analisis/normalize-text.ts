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

// Perkataan umum / hiasan yang kerap muncul dalam "urusan program"
// tapi biasanya tidak menentukan "program yang sama".
const URUSAN_STOPWORDS = new Set([
  // Contoh dari permintaan user
  "bengkel",
  "kerja",
  "penataran",
  "kurikulum",
  "pembelajaran",
  "bersepadu",
  "persekolahan",
  "mata",
  "pelajaran",

  // Umum dalam konteks program/urusan
  "program",
  "aktiviti",
  "mesyuarat",
  "latihan",
  "penyelarasan",
]);

/** Sama program jika urusan hampir sama (1–2 aksara berbeza, dll.). */
export function urusanMatches(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return na === nb;
  if (na === nb) return true;

  // 1) Token-based matching (lebih stabil bila ayat panjang berbeza gaya penulisan)
  const coreA = na
    .split(" ")
    .filter(Boolean)
    .filter((t) => !URUSAN_STOPWORDS.has(t));
  const coreB = nb
    .split(" ")
    .filter(Boolean)
    .filter((t) => !URUSAN_STOPWORDS.has(t));

  if (coreA.length > 0 && coreB.length > 0) {
    const setA = new Set(coreA);
    const setB = new Set(coreB);
    const inter = [...setA].reduce((s, t) => s + (setB.has(t) ? 1 : 0), 0);
    const union = new Set([...setA, ...setB]).size;

    // "Setara" jika token penting bertindih sekurang-kurangnya 50%
    // (dan tidak cuma 1 token kebetulan).
    const jaccard = union > 0 ? inter / union : 0;
    if (jaccard >= 0.5 && inter >= 2) return true;
  }

  // 2) Fallback: similarity string (contoh kes urusan pendek / dekat ejaan)
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
