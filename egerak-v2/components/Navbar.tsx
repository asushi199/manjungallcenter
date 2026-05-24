"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/cn";
import PpdLogo from "@/components/PpdLogo";
import { AdminNavMenuDesktop, AdminNavMenuMobile } from "@/components/AdminNavMenu";

const LINKS = [
  { href: "/dashboard", label: "Utama" },
  { href: "/new", label: "Isi Pergerakan" },
  { href: "/my", label: "Pergerakan Saya" },
  { href: "/bilik", label: "Tempahan Bilik" },
];

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
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-2.5">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-lg font-bold shrink-0 min-w-0"
        >
          <PpdLogo width={78} className="shrink-0 object-contain" />
          <span className="leading-snug -ml-0.5">
            eGerak <span className="font-normal opacity-90">PPD Manjung</span>
          </span>
        </Link>
        <nav className="hidden md:flex gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium",
                path?.startsWith(l.href)
                  ? "bg-white text-brand-700"
                  : "text-white/90 hover:bg-white/10",
              )}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <>
              <Link
                href="/admin/laporan-opr"
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium",
                  path?.startsWith("/admin/laporan-opr")
                    ? "bg-white text-brand-700"
                    : "text-white/90 hover:bg-white/10",
                )}
              >
                Laporan OPR
              </Link>
              <AdminNavMenuDesktop />
            </>
          )}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <div className="hidden sm:block text-right leading-tight">
            <div className="font-medium">{user?.nama}</div>
            <div className="text-xs text-white/80">{user?.username}</div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ redirectTo: "/login" })}
            className="rounded-md bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs"
          >
            Log Keluar
          </button>
        </div>
      </div>
      <nav className="md:hidden border-t border-white/15">
        <div className="mx-auto max-w-7xl flex flex-wrap">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex-1 text-center text-sm py-2 min-w-[4.5rem]",
                path?.startsWith(l.href) ? "bg-white text-brand-700" : "text-white/90",
              )}
            >
              {l.label === "Pergerakan Saya" ? "Saya" : l.label === "Isi Pergerakan" ? "Isi" : l.label === "Tempahan Bilik" ? "Bilik" : l.label}
            </Link>
          ))}
          {isAdmin && (
            <>
              <Link
                href="/admin/laporan-opr"
                className={cn(
                  "flex-1 text-center text-sm py-2 min-w-[4.5rem]",
                  path?.startsWith("/admin/laporan-opr")
                    ? "bg-white text-brand-700"
                    : "text-white/90",
                )}
              >
                Laporan
              </Link>
              <AdminNavMenuMobile />
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
