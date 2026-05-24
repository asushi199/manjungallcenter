"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import PpdLogo from "@/components/PpdLogo";
import HeaderNavDropdown, { type NavLink } from "@/components/HeaderNavDropdown";

const MAIN_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Utama" },
  { href: "/new", label: "Daftar Pergerakan" },
  { href: "/my", label: "Pergerakan Saya" },
  { href: "/bilik", label: "Tempahan Bilik" },
];

const PENGGUNA_LINKS: NavLink[] = [{ href: "/admin/users", label: "Pengurusan Pengguna" }];

const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/laporan-opr", label: "Laporan OPR" },
  { href: "/admin/pergerakan", label: "Padam Pergerakan" },
  { href: "/admin/import", label: "Import Rancangan" },
];

function currentMainLabel(path: string | null) {
  const hit = MAIN_LINKS.find((l) => path === l.href || path?.startsWith(l.href + "/"));
  return hit?.label ?? "Menu";
}

function allMobileLinks(isAdmin: boolean): NavLink[] {
  if (!isAdmin) return [...MAIN_LINKS];
  return [...MAIN_LINKS, ...PENGGUNA_LINKS, ...ADMIN_LINKS];
}

export default function Navbar() {
  const path = usePathname();
  const { data } = useSession();
  const user = data?.user;
  const isAdmin = user?.peranan === "Admin";

  if (path?.endsWith("/opr/print")) {
    return null;
  }

  const logoutBtn = (
    <button
      type="button"
      onClick={() => signOut({ redirectTo: "/login" })}
      className="rounded-md bg-white/15 hover:bg-white/25 px-2.5 py-1.5 text-xs whitespace-nowrap"
    >
      Log Keluar
    </button>
  );

  return (
    <header className="bg-brand-700 text-white shadow">
      {/* Telefon: 2 baris */}
      <div className="mx-auto max-w-7xl px-3 py-2 sm:px-4 md:hidden space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Link href="/dashboard" className="flex items-center gap-1.5 shrink-0 min-w-0">
            <PpdLogo width={52} className="shrink-0 object-contain" />
            <span className="font-bold text-sm leading-tight whitespace-nowrap">eGerak</span>
          </Link>
          {logoutBtn}
        </div>
        <div className="flex justify-end">
          <HeaderNavDropdown label="Menu" links={allMobileLinks(!!isAdmin)} />
        </div>
      </div>

      {/* Desktop: 1 baris */}
      <div className="mx-auto max-w-7xl hidden md:flex items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <PpdLogo width={72} className="shrink-0 object-contain" />
          <span className="text-lg font-bold leading-tight whitespace-nowrap">
            eGerak <span className="font-normal opacity-90">PPD Manjung</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 flex-wrap justify-center flex-1 min-w-0">
          <HeaderNavDropdown label={currentMainLabel(path)} links={MAIN_LINKS} />
          {isAdmin && (
            <>
              <HeaderNavDropdown label="Pengguna" links={PENGGUNA_LINKS} />
              <HeaderNavDropdown label="Admin" links={ADMIN_LINKS} />
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 shrink-0 text-sm">
          <div className="hidden lg:block text-right leading-tight">
            <div className="font-medium">{user?.nama}</div>
            <div className="text-xs text-white/80">{user?.username}</div>
          </div>
          {logoutBtn}
        </div>
      </div>
    </header>
  );
}
