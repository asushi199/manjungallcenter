/** Rekod bertindih dengan julat hari [start, end] (inklusif). */
export function pergerakanOverlapsRange(
  tarikhPergi: Date,
  tarikhKembali: Date,
  start: Date,
  end: Date,
): boolean {
  return tarikhPergi <= end && tarikhKembali >= start;
}
