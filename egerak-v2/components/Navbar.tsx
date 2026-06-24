"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import SentraLogo from "@/components/SentraLogo";
import PwaInstallButton from "@/components/PwaInstallButton";
import HeaderNavDropdown from "@/components/HeaderNavDropdown";
import AdminRequestsBadge from "@/components/AdminRequestsBadge";
import {
  adminMenuLinksForPeranan,
  mainNavLinksForPeranan,
} from "@/lib/app-nav";
import { isFullAdmin } from "@/lib/roles";
import { APP_SHORT_NAME } from "@/lib/branding";
import { cn } from "@/lib/cn";

function isActive(path: string | null, href: string) {
  return path === href || (path?.startsWith(href + "/") ?? false);
}

/** Label ringkas untuk tab desktop (sepadan dengan bar bawah telefon). */
const TAB_SHORT_LABELS: Record<string, string> = {
  "/dashboard": "Utama",
  "/new": "Daftar",
  "/my": "Saya",
  "/takwim": "Takwim",
  "/bilik": "Bilik",
};

export default function Navbar() {
  const path = usePathname();
  const { data } = useSession();
  const user = data?.user;
  const peranan = user?.peranan;

  if (path?.endsWith("/opr/print")) {
    return null;
  }

  const mainLinks = mainNavLinksForPeranan(peranan);
  const adminMenuLinks = adminMenuLinksForPeranan(peranan);
  const showRequestsBadge = isFullAdmin(peranan);

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
    <header className="bg-brand-700 text-white shadow sticky top-0 z-40">
      <div className="mx-auto max-w-7xl md:hidden flex items-center gap-2 px-3 py-2.5 min-h-[3.25rem]">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0 flex-1">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-white/20 shadow-sm">
            <SentraLogo size={40} />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block font-bold text-[15px] tracking-tight">{APP_SHORT_NAME}</span>
            <span className="block text-[11px] font-semibold text-white/90">PPD Manjung</span>
          </span>
        </Link>
        <PwaInstallButton variant="nav-link" className="shrink-0" />
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Log keluar dari SentRa?")) signOut({ redirectTo: "/login" });
          }}
          className="shrink-0 rounded-md bg-white/15 hover:bg-white/25 p-2"
          aria-label="Log Keluar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      </div>

      <div className="mx-auto max-w-7xl hidden md:flex items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-white/20 shadow-sm">
            <SentraLogo size={48} />
          </span>
          <span className="text-lg font-bold leading-tight whitespace-nowrap">
            {APP_SHORT_NAME} <span className="font-normal opacity-90">PPD Manjung</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 flex-wrap justify-center flex-1 min-w-0">
          {mainLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                isActive(path, l.href)
                  ? "bg-white text-brand-700"
                  : "text-white/90 hover:bg-white/10",
              )}
            >
              {TAB_SHORT_LABELS[l.href] ?? l.label}
            </Link>
          ))}
          {adminMenuLinks.length > 0 && (
            <span className="relative inline-flex">
              <HeaderNavDropdown label="Admin" links={adminMenuLinks} />
              {showRequestsBadge && <AdminRequestsBadge />}
            </span>
          )}
        </nav>

        <div className="flex items-center gap-2 shrink-0 text-sm">
          <div className="hidden lg:block text-right leading-tight max-w-[16rem]">
            <div className="font-medium truncate" title={user?.nama ?? undefined}>
              {user?.nama}
            </div>
            {user?.jawatan && (
              <div className="text-xs text-white/80 truncate" title={user.jawatan}>
                {user.jawatan}
              </div>
            )}
          </div>
          <PwaInstallButton variant="nav-link" />
          {logoutBtn}
        </div>
      </div>
    </header>
  );
}
