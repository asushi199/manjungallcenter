/** Peranan pengguna dalam sistem. */
export const PERANAN_VALUES = [
  "Admin",
  "Penyelia",
  "Timbalan_PPD",
  "Ketua_Unit",
  "Pengguna",
] as const;
export type UserPeranan = (typeof PERANAN_VALUES)[number];

export const PERANAN_LABELS: Record<UserPeranan, string> = {
  Admin: "Pentadbir (penuh)",
  Penyelia: "Penyelia — semua laporan OPR",
  Timbalan_PPD: "Timbalan PPD — laporan beberapa sektor",
  Ketua_Unit: "Ketua Unit — laporan sektor sendiri",
  Pengguna: "Pengguna",
};

export function isFullAdmin(peranan: string | undefined | null): boolean {
  return peranan === "Admin";
}

export function isPenyelia(peranan: string | undefined | null): boolean {
  return peranan === "Penyelia";
}

export function isKetuaOrTimbalan(peranan: string | undefined | null): boolean {
  return peranan === "Ketua_Unit" || peranan === "Timbalan_PPD";
}

/** Lihat Analisis Program (pergerakan, bukan cuti). */
export function canViewAnalisisPergerakan(peranan: string | undefined | null): boolean {
  return (
    isFullAdmin(peranan) ||
    isPenyelia(peranan) ||
    isKetuaOrTimbalan(peranan)
  );
}

/** Lihat semua sektor dalam Analisis Program. */
export function canViewAllAnalisisPergerakan(peranan: string | undefined | null): boolean {
  return isFullAdmin(peranan) || isPenyelia(peranan);
}

/** Lihat halaman Laporan OPR. */
export function canViewLaporanOpr(peranan: string | undefined | null): boolean {
  return (
    peranan === "Admin" ||
    peranan === "Penyelia" ||
    peranan === "Timbalan_PPD" ||
    peranan === "Ketua_Unit"
  );
}

/** Lihat semua sektor dalam Laporan OPR. */
export function canViewAllLaporanOpr(peranan: string | undefined | null): boolean {
  return peranan === "Admin" || peranan === "Penyelia";
}

/** Skop sektor ditetapkan oleh pentadbir (bukan satu sektor profil). */
export function perananUsesLaporanSektorScope(peranan: UserPeranan | string): boolean {
  return peranan === "Timbalan_PPD";
}

export function canManageUsers(peranan: string | undefined | null): boolean {
  return isFullAdmin(peranan);
}

/** Padam pergerakan — pentadbir penuh atau Ketua/Timbalan (ikut skop sektor). */
export function canSectorDeletePergerakan(peranan: string | undefined | null): boolean {
  return isFullAdmin(peranan) || isKetuaOrTimbalan(peranan);
}

export function canImportRancangan(peranan: string | undefined | null): boolean {
  return isFullAdmin(peranan) || isKetuaOrTimbalan(peranan);
}

export function canAdminRoomBookings(peranan: string | undefined | null): boolean {
  return isFullAdmin(peranan);
}

export function perananRequiresSektor(peranan: UserPeranan): boolean {
  return peranan === "Ketua_Unit";
}

export function isKnownPeranan(v: string): v is UserPeranan {
  return (PERANAN_VALUES as readonly string[]).includes(v);
}

export const PERANAN_SELECT_OPTIONS: { value: UserPeranan; label: string }[] = [
  { value: "Pengguna", label: "Pengguna" },
  { value: "Ketua_Unit", label: "Ketua Unit" },
  { value: "Timbalan_PPD", label: "Timbalan PPD" },
  { value: "Penyelia", label: "Penyelia" },
  { value: "Admin", label: "Pentadbir" },
];

export function perananBadgeClass(peranan: string): string {
  switch (peranan) {
    case "Admin":
      return "bg-amber-100 text-amber-800";
    case "Penyelia":
      return "bg-violet-100 text-violet-800";
    case "Timbalan_PPD":
      return "bg-teal-100 text-teal-800";
    case "Ketua_Unit":
      return "bg-sky-100 text-sky-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

/** @deprecated Guna canSectorDeletePergerakan */
export function canAdminDeletePergerakan(peranan: string | undefined | null): boolean {
  return canSectorDeletePergerakan(peranan);
}
