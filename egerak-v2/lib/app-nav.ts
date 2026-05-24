import { canViewLaporanOpr, isFullAdmin } from "./roles";

export type AppNavLink = { href: string; label: string };

export const MAIN_NAV_LINKS: AppNavLink[] = [
  { href: "/dashboard", label: "Utama" },
  { href: "/new", label: "Daftar Pergerakan" },
  { href: "/my", label: "Pergerakan Saya" },
  { href: "/bilik", label: "Tempahan Bilik" },
];

export const LAPORAN_OPR_LINK: AppNavLink = {
  href: "/admin/laporan-opr",
  label: "Laporan OPR",
};

/** Menu pentadbir penuh (Admin sahaja). */
export const FULL_ADMIN_NAV_LINKS: AppNavLink[] = [
  { href: "/admin/users", label: "Pengurusan Pengguna" },
  LAPORAN_OPR_LINK,
  { href: "/admin/pergerakan", label: "Padam Pergerakan" },
  { href: "/admin/import", label: "Import Rancangan" },
];

/** @deprecated Guna FULL_ADMIN_NAV_LINKS */
export const ADMIN_NAV_LINKS = FULL_ADMIN_NAV_LINKS;

export function mainNavLinksForPeranan(peranan: string | undefined | null): AppNavLink[] {
  const links = [...MAIN_NAV_LINKS];
  if (canViewLaporanOpr(peranan) && !isFullAdmin(peranan)) {
    links.push(LAPORAN_OPR_LINK);
  }
  return links;
}

export function adminNavLinksForPeranan(peranan: string | undefined | null): AppNavLink[] {
  return isFullAdmin(peranan) ? [...FULL_ADMIN_NAV_LINKS] : [];
}

/** Semua pautan navigasi untuk cetakan / menu gabungan. */
export function navLinksForPeranan(peranan: string | undefined | null): AppNavLink[] {
  return [...mainNavLinksForPeranan(peranan), ...adminNavLinksForPeranan(peranan)];
}

/** @deprecated Guna navLinksForPeranan(peranan) */
export function navLinksForUser(isAdmin: boolean): AppNavLink[] {
  return navLinksForPeranan(isAdmin ? "Admin" : "Pengguna");
}
