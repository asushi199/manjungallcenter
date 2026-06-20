import {
  canImportRancangan,
  canSectorDeletePergerakan,
  canTrackPegawai,
  canViewAnalisisPergerakan,
  canViewLaporanOpr,
  isFullAdmin,
  isKetuaOrTimbalan,
  isPenyelia,
} from "./roles";

export type AppNavLink = { href: string; label: string };

export const MAIN_NAV_LINKS: AppNavLink[] = [
  { href: "/dashboard", label: "Utama" },
  { href: "/new", label: "Daftar Pergerakan" },
  { href: "/my", label: "Pergerakan Saya" },
  { href: "/takwim", label: "Takwim" },
  { href: "/bilik", label: "Tempahan Bilik" },
];

export const LAPORAN_OPR_LINK: AppNavLink = {
  href: "/admin/laporan-opr",
  label: "Laporan OPR",
};

export const ANALISIS_PROGRAM_LINK: AppNavLink = {
  href: "/admin/analisis-pergerakan",
  label: "Analisis Pergerakan & OPR",
};

export const JEJAK_PEGAWAI_LINK: AppNavLink = {
  href: "/jejak-pegawai",
  label: "Jejak Pegawai",
};

export const IMPORT_RANCANGAN_LINK: AppNavLink = {
  href: "/admin/import",
  label: "Import Rancangan",
};

export const PADAM_PERGERAKAN_LINK: AppNavLink = {
  href: "/admin/pergerakan",
  label: "Padam Pergerakan",
};

/** Menu pentadbir penuh (Admin sahaja). */
export const FULL_ADMIN_NAV_LINKS: AppNavLink[] = [
  { href: "/admin/users", label: "Pengurusan Pengguna" },
  ANALISIS_PROGRAM_LINK,
  JEJAK_PEGAWAI_LINK,
  LAPORAN_OPR_LINK,
  PADAM_PERGERAKAN_LINK,
  IMPORT_RANCANGAN_LINK,
];

/** @deprecated Guna FULL_ADMIN_NAV_LINKS */
export const ADMIN_NAV_LINKS = FULL_ADMIN_NAV_LINKS;

const PENYELIA_ROLE_NAV_LINKS: AppNavLink[] = [
  ANALISIS_PROGRAM_LINK,
  JEJAK_PEGAWAI_LINK,
  LAPORAN_OPR_LINK,
];

/** Utama sahaja — sama untuk semua peranan. */
export function mainNavLinksForPeranan(_peranan?: string | null): AppNavLink[] {
  return [...MAIN_NAV_LINKS];
}

/** Menu ikut peranan (Ketua / Timbalan / Penyelia), berasingan daripada Utama. */
export function roleNavLinksForPeranan(peranan: string | undefined | null): AppNavLink[] {
  if (!peranan || isFullAdmin(peranan)) return [];

  if (isPenyelia(peranan)) {
    return [...PENYELIA_ROLE_NAV_LINKS];
  }

  if (isKetuaOrTimbalan(peranan)) {
    const links: AppNavLink[] = [];
    if (canViewAnalisisPergerakan(peranan)) links.push(ANALISIS_PROGRAM_LINK);
    if (canTrackPegawai(peranan)) links.push(JEJAK_PEGAWAI_LINK);
    if (canViewLaporanOpr(peranan)) links.push(LAPORAN_OPR_LINK);
    if (canImportRancangan(peranan)) links.push(IMPORT_RANCANGAN_LINK);
    if (canSectorDeletePergerakan(peranan)) links.push(PADAM_PERGERAKAN_LINK);
    return links;
  }

  return [];
}

export function adminNavLinksForPeranan(peranan: string | undefined | null): AppNavLink[] {
  return isFullAdmin(peranan) ? [...FULL_ADMIN_NAV_LINKS] : [];
}

/**
 * Pautan menu pentadbiran (gabungan) — tajuk seragam "Admin" untuk semua peranan istimewa.
 * Peranan penuh (Admin) dan peranan ikut sektor (Ketua/Timbalan/Pegawai PPD) saling eksklusif.
 */
export function adminMenuLinksForPeranan(peranan: string | undefined | null): AppNavLink[] {
  return [...roleNavLinksForPeranan(peranan), ...adminNavLinksForPeranan(peranan)];
}

/** Semua pautan (cetak / menu gabungan). */
export function navLinksForPeranan(peranan: string | undefined | null): AppNavLink[] {
  return [
    ...mainNavLinksForPeranan(peranan),
    ...roleNavLinksForPeranan(peranan),
    ...adminNavLinksForPeranan(peranan),
  ];
}

/** @deprecated Guna navLinksForPeranan(peranan) */
export function navLinksForUser(isAdmin: boolean): AppNavLink[] {
  return navLinksForPeranan(isAdmin ? "Admin" : "Pengguna");
}
