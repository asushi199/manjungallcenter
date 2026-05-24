"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { AppNavLink } from "@/lib/app-nav";

function isActive(path: string | null, href: string) {
  return path === href || (path?.startsWith(href + "/") ?? false);
}

/** Menu navigasi pada bar gelap (cth. pratonton cetak OPR). */
export default function ToolbarNavDropdown({
  label,
  links,
}: {
  label: string;
  links: AppNavLink[];
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1.5 rounded bg-white/15 hover:bg-white/25 px-3 py-1.5 text-sm font-medium whitespace-nowrap"
      >
        <span>{label}</span>
        <span className="text-[10px] opacity-80" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 min-w-[14rem] max-h-[min(70vh,24rem)] overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {links.map((l) => (
            <Link
              key={`${l.href}-${l.label}`}
              href={l.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(
                "block px-3 py-2.5 text-sm text-slate-800 hover:bg-slate-50",
                isActive(path, l.href) && "bg-brand-50 text-brand-800 font-medium",
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
