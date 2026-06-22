"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState, type ReactElement } from "react";
import { cn } from "@/lib/cn";
import { adminMenuLinksForPeranan } from "@/lib/app-nav";

function isActive(path: string | null, href: string) {
  return path === href || (path?.startsWith(href + "/") ?? false);
}

type IconProps = { className?: string };

function HomeIcon({ className }: IconProps) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function ListIcon({ className }: IconProps) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

function CalendarIcon({ className }: IconProps) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 2v4M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function DoorIcon({ className }: IconProps) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17" />
      <path d="M3 21h18" />
      <path d="M12.5 12v1.5" />
    </svg>
  );
}

function AdminIcon({ className }: IconProps) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 4 6v5c0 4.5 3.2 7.8 8 10 4.8-2.2 8-5.5 8-10V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function PlusIcon({ className }: IconProps) {
  return (
    <svg className={className} width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function Tab({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: (p: IconProps) => ReactElement;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px]",
        active ? "text-brand-700 font-semibold" : "text-slate-400",
      )}
    >
      <Icon className="h-6 w-6" />
      <span>{label}</span>
    </Link>
  );
}

export default function BottomTabBar() {
  const path = usePathname();
  const { data } = useSession();
  const peranan = data?.user?.peranan;
  const adminLinks = adminMenuLinksForPeranan(peranan);
  const hasAdmin = adminLinks.length > 0;
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSheetOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  if (path?.endsWith("/opr/print")) return null;

  const adminActive =
    isActive(path, "/bilik") || adminLinks.some((l) => isActive(path, l.href));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-slate-200 bg-white px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-1px_8px_rgba(0,0,0,0.05)] md:hidden"
        aria-label="Navigasi utama"
      >
        <Tab href="/dashboard" label="Utama" Icon={HomeIcon} active={isActive(path, "/dashboard")} />
        <Tab href="/my" label="Saya" Icon={ListIcon} active={isActive(path, "/my")} />

        <Link
          href="/new"
          className="flex flex-1 flex-col items-center gap-0.5 text-[11px] font-medium text-teal-700"
          aria-label="Daftar Pergerakan"
        >
          <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-teal-600 text-white shadow-md">
            <PlusIcon />
          </span>
          <span>Daftar</span>
        </Link>

        <Tab href="/takwim" label="Takwim" Icon={CalendarIcon} active={isActive(path, "/takwim")} />

        {hasAdmin ? (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-expanded={sheetOpen}
            aria-haspopup="menu"
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px]",
              adminActive || sheetOpen ? "text-brand-700 font-semibold" : "text-slate-400",
            )}
          >
            <AdminIcon className="h-6 w-6" />
            <span>Admin</span>
          </button>
        ) : (
          <Tab href="/bilik" label="Bilik" Icon={DoorIcon} active={isActive(path, "/bilik")} />
        )}
      </nav>

      {sheetOpen && hasAdmin && (
        <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal>
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Tutup menu"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl">
            <div className="sticky top-0 bg-white pt-2">
              <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-slate-300" />
              <div className="flex items-center justify-between px-4 py-2">
                <p className="text-sm font-semibold text-slate-700">Admin</p>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                  aria-label="Tutup"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <p className="px-4 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Pintasan
            </p>
            <SheetLink href="/bilik" label="Tempahan Bilik" path={path} onNavigate={() => setSheetOpen(false)} />

            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Admin
            </p>
            {adminLinks.map((l) => (
              <SheetLink key={l.href} href={l.href} label={l.label} path={path} onNavigate={() => setSheetOpen(false)} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function SheetLink({
  href,
  label,
  path,
  onNavigate,
}: {
  href: string;
  label: string;
  path: string | null;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "block border-l-4 border-transparent px-4 py-3 text-base text-slate-800",
        isActive(path, href) && "border-brand-600 bg-brand-50 font-semibold text-brand-800",
      )}
    >
      {label}
    </Link>
  );
}
