"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import PpdLogo from "@/components/PpdLogo";
import PwaInstallButton from "@/components/PwaInstallButton";
import HeaderNavDropdown from "@/components/HeaderNavDropdown";
import MobileNavMenu from "@/components/MobileNavMenu";
import {
  adminMenuLinksForPeranan,
  mainNavLinksForPeranan,
} from "@/lib/app-nav";
import { APP_SHORT_NAME } from "@/lib/branding";

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
          <PpdLogo width={44} className="shrink-0 object-contain" />
          <span className="min-w-0 leading-tight">
            <span className="block font-bold text-[15px] tracking-tight">{APP_SHORT_NAME}</span>
            <span className="block text-[11px] font-semibold text-white/90">PPD Manjung</span>
          </span>
        </Link>
        <MobileNavMenu
          mainLinks={mainLinks}
          adminLinks={adminMenuLinks}
          showAdminSection={adminMenuLinks.length > 0}
          userNama={user?.nama}
          userUsername={user?.username}
        />
      </div>

      <div className="mx-auto max-w-7xl hidden md:flex items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <PpdLogo width={72} className="shrink-0 object-contain" />
          <span className="text-lg font-bold leading-tight whitespace-nowrap">
            {APP_SHORT_NAME} <span className="font-normal opacity-90">PPD Manjung</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 flex-wrap justify-center flex-1 min-w-0">
          <HeaderNavDropdown label="Utama" links={mainLinks} />
          {adminMenuLinks.length > 0 && (
            <HeaderNavDropdown label="Admin" links={adminMenuLinks} />
          )}
        </nav>

        <div className="flex items-center gap-2 shrink-0 text-sm">
          <div className="hidden lg:block text-right leading-tight">
            <div className="font-medium">{user?.nama}</div>
            <div className="text-xs text-white/80">{user?.username}</div>
          </div>
          <PwaInstallButton variant="nav-link" />
          {logoutBtn}
        </div>
      </div>
    </header>
  );
}
