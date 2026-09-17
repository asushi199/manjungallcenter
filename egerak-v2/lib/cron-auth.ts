/**
 * Pengesahan panggilan cron luar / Vercel Cron.
 * Jangan dedahkan CRON_SECRET dalam UI.
 */

export function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = req.headers.get("authorization")?.trim();
  if (auth === `Bearer ${secret}`) return true;

  const headerSecret = req.headers.get("x-cron-secret")?.trim();
  if (headerSecret === secret) return true;

  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) return true;

  return false;
}

export function isCronSecretConfigured(): boolean {
  return !!process.env.CRON_SECRET?.trim();
}
