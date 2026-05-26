"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/cn";
import type { AppNavLink } from "@/lib/app-nav";

function isActive(path: string | null, href: string) {
  return path === href || (path?.startsWith(href + "/") ?? false);
}

function NavSection({
  title,
  links,
  path,
  onNavigate,
}: {
  title: string;
  links: AppNavLink[];
  path: string | null;
  onNavigate: () => void;
}) {
  return (
    <div>
      <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <ul className="py-1">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              onClick={onNavigate}
              className={cn(
                "block px-4 py-3 text-base text-slate-800 border-l-4 border-transparent",
                isActive(path, l.href) &&
                  "border-brand-600 bg-brand-50 text-brand-800 font-semibold",
              )}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MobileNavMenu({
  mainLinks,
  roleLinks,
  roleSectionTitle,
  adminLinks,
  showAdminSection,
  userNama,
  userUsername,
}: {
  mainLinks: AppNavLink[];
  roleLinks?: AppNavLink[];
  roleSectionTitle?: string;
  adminLinks: AppNavLink[];
  showAdminSection: boolean;
  userNama?: string;
  userUsername?: string;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-white/15 hover:bg-white/25 px-3 py-2 text-sm font-medium shrink-0"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
      >
        <span className="sr-only">Buka menu</span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
        Menu
      </button>

      {open && (
        <div id="mobile-nav-panel" className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal>
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Tutup menu"
            onClick={close}
          />
          <aside className="absolute right-0 top-0 h-full w-[min(100%,20rem)] bg-white shadow-xl flex flex-col">
            <div className="bg-brand-700 text-white px-4 py-4 shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold leading-tight">eGerak</p>
                  <p className="text-sm text-white/90">PPD Manjung</p>
                  {userNama && (
                    <p className="mt-2 text-xs text-white/80 truncate max-w-[14rem]">
                      {userNama}
                      {userUsername ? ` · ${userUsername}` : ""}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md bg-white/15 hover:bg-white/25 p-2 shrink-0"
                  aria-label="Tutup"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto">
              <NavSection title="Utama" links={mainLinks} path={path} onNavigate={close} />
              {roleLinks && roleLinks.length > 0 && roleSectionTitle && (
                <NavSection
                  title={roleSectionTitle}
                  links={roleLinks}
                  path={path}
                  onNavigate={close}
                />
              )}
              {showAdminSection && (
                <NavSection title="Pentadbir" links={adminLinks} path={path} onNavigate={close} />
              )}
            </nav>

            <div className="border-t p-4 shrink-0">
              <button
                type="button"
                className="btn-secondary w-full justify-center"
                onClick={() => {
                  close();
                  signOut({ redirectTo: "/login" });
                }}
              >
                Log Keluar
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
