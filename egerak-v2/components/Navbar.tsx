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

export default function Navbar() {
  const path = usePathname();
  const { data } = useSession();
  const user = data?.user;
  const isAdmin = user?.peranan === "Admin";

  if (path?.endsWith("/opr/print")) {
    return null;
  }

  return (
    <header className="bg-brand-700 text-white shadow">
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-base sm:text-lg font-bold shrink min-w-0"
        >
          <PpdLogo width={72} className="sm:hidden shrink-0 object-contain" />
          <PpdLogo width={78} className="hidden sm:block shrink-0 object-contain" />
          <span className="leading-snug -ml-0.5 truncate">
            eGerak <span className="font-normal opacity-90 hidden sm:inline">PPD Manjung</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
          <HeaderNavDropdown label={currentMainLabel(path)} links={MAIN_LINKS} />
          {isAdmin && (
            <>
              <HeaderNavDropdown
                label={
                  path?.startsWith("/admin/users") ? "Pengurusan Pengguna" : "Pengguna"
                }
                links={PENGGUNA_LINKS}
              />
              <HeaderNavDropdown label="Admin" links={ADMIN_LINKS} />
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 text-sm shrink-0">
          <div className="hidden lg:block text-right leading-tight">
            <div className="font-medium">{user?.nama}</div>
            <div className="text-xs text-white/80">{user?.username}</div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ redirectTo: "/login" })}
            className="rounded-md bg-white/15 hover:bg-white/25 px-2.5 py-1.5 text-xs whitespace-nowrap"
          >
            Log Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
