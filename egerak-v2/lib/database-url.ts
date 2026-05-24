/** Buang tanda petik luar jika disalin ke Vercel dengan "..." (punca Invalid URL). */
export function normalizeDatabaseUrl(raw: string | undefined): string {
  if (!raw?.trim()) {
    throw new Error("DATABASE_URL is not set. Salin .env.local.example ke .env.local dan isi.");
  }
  let url = raw.trim();
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }
  return url;
}
