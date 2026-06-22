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

            <div className="grid grid-cols-2 gap-3 p-4">
              <AdminTile href="/bilik" label="Tempahan Bilik" active={isActive(path, "/bilik")} onNavigate={() => setSheetOpen(false)} />
              {adminLinks.map((l) => (
                <AdminTile
                  key={l.href}
                  href={l.href}
                  label={l.label}
                  active={isActive(path, l.href)}
                  onNavigate={() => setSheetOpen(false)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type GlyphName =
  | "door"
  | "users"
  | "chart"
  | "search"
  | "file"
  | "inbox"
  | "trash"
  | "upload"
  | "grid";

const ADMIN_META: Record<string, { glyph: GlyphName; danger?: boolean }> = {
  "/bilik": { glyph: "door" },
  "/admin/users": { glyph: "users" },
  "/admin/analisis-pergerakan": { glyph: "chart" },
  "/jejak-pegawai": { glyph: "search" },
  "/admin/laporan-opr": { glyph: "file" },
  "/admin/bilik-permohonan": { glyph: "inbox" },
  "/admin/pergerakan": { glyph: "trash", danger: true },
  "/admin/import": { glyph: "upload" },
};

function AdminTile({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  const meta = ADMIN_META[href] ?? { glyph: "grid" as GlyphName };
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex flex-col gap-2 rounded-2xl border bg-white p-3 shadow-sm transition active:scale-[0.97]",
        active ? "border-brand-300 ring-1 ring-brand-200" : "border-slate-200 hover:shadow-md",
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm",
          meta.danger
            ? "bg-gradient-to-br from-rose-500 to-red-600"
            : "bg-gradient-to-br from-brand-600 to-cyan-600",
        )}
      >
        <Glyph name={meta.glyph} className="h-5 w-5" />
      </span>
      <span className="text-[13px] font-semibold leading-tight text-slate-800">{label}</span>
    </Link>
  );
}

function Glyph({ name, className }: { name: GlyphName; className?: string }) {
  const p = {
    className,
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "door":
      return (
        <svg {...p}>
          <path d="M5 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17" />
          <path d="M3 21h18M12.5 12v1.5" />
        </svg>
      );
    case "users":
      return (
        <svg {...p}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
          <path d="M16 6a3 3 0 0 1 0 6M19 20c0-2-1-3.6-3-4.4" />
        </svg>
      );
    case "chart":
      return (
        <svg {...p}>
          <path d="M4 20V11M10 20V4M16 20v-6M2 20h20" />
        </svg>
      );
    case "search":
      return (
        <svg {...p}>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4-4" />
        </svg>
      );
    case "file":
      return (
        <svg {...p}>
          <path d="M14 3v5h5" />
          <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
          <path d="M9 13h6M9 17h6" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...p}>
          <path d="M4 13h4l1 2h6l1-2h4" />
          <path d="M5 5h14l2 8v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5z" />
        </svg>
      );
    case "trash":
      return (
        <svg {...p}>
          <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
        </svg>
      );
    case "upload":
      return (
        <svg {...p}>
          <path d="M12 15V3M7 8l5-5 5 5M5 21h14" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <rect x="4" y="4" width="7" height="7" rx="1" />
          <rect x="13" y="4" width="7" height="7" rx="1" />
          <rect x="4" y="13" width="7" height="7" rx="1" />
          <rect x="13" y="13" width="7" height="7" rx="1" />
        </svg>
      );
  }
}
