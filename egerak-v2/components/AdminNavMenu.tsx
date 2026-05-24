"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const ADMIN_LINKS = [
  { href: "/admin/users", label: "Pengguna" },
  { href: "/admin/import", label: "Import Rancangan" },
] as const;

function isAdminMenuPath(path: string | null | undefined) {
  return ADMIN_LINKS.some((l) => path?.startsWith(l.href));
}

export function AdminNavMenuDesktop() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = isAdminMenuPath(path);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium",
          active ? "bg-white text-brand-700" : "text-white/90 hover:bg-white/10",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Admin
        <span className="text-[10px] opacity-80" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {ADMIN_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(
                "block px-3 py-2 text-sm text-slate-800 hover:bg-slate-50",
                path?.startsWith(l.href) && "bg-brand-50 text-brand-800 font-medium",
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminNavMenuMobile() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = isAdminMenuPath(path);

  return (
    <div className="flex-1 min-w-0 border-l border-white/15">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full text-center text-sm py-2",
          active || open ? "bg-white text-brand-700" : "text-white/90",
        )}
        aria-expanded={open}
      >
        Admin
      </button>
      {open && (
        <div className="bg-brand-800 border-t border-white/15 px-2 py-1 space-y-0.5">
          {ADMIN_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded px-2 py-1.5 text-xs text-white/90 hover:bg-white/10",
                path?.startsWith(l.href) && "bg-white/20 font-medium",
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
