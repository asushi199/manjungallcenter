/**
 * Dasar swakhidmat tempahan bilik.
 *
 * Dalam tempoh 24 jam selepas tempahan dibuat, pengguna boleh batal/ubah sendiri
 * serta-merta. Selepas 24 jam, batal/ubah mesti dimohon dan diluluskan Admin
 * (tempahan asal kekal sehingga diluluskan).
 */
export const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

/** Adakah tempahan masih dalam tempoh swakhidmat 24 jam (boleh batal/ubah sendiri)? */
export function isWithinGrace(createdAt: Date | string, now: Date = new Date()): boolean {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return now.getTime() - created.getTime() < GRACE_PERIOD_MS;
}

/** Baki masa swakhidmat dalam milisaat (0 jika sudah tamat). */
export function graceRemainingMs(createdAt: Date | string, now: Date = new Date()): number {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return Math.max(0, created.getTime() + GRACE_PERIOD_MS - now.getTime());
}
