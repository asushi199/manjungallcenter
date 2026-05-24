"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type NavLink = { href: string; label: string };

function isActive(path: string | null, href: string) {
  return path === href || (path?.startsWith(href + "/") ?? false);
}

export default function HeaderNavDropdown({
  label,
  links,
  className,
}: {
  label: string;
  links: NavLink[];
  className?: string;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = links.some((l) => isActive(path, l.href));

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
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium max-w-[11.5rem] sm:max-w-[14rem]",
          active ? "bg-white text-brand-700" : "text-white/90 hover:bg-white/10",
        )}
      >
        <span className="truncate">{label}</span>
        <span className="text-[10px] opacity-80 shrink-0" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 min-w-[12rem] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(
                "block px-3 py-2 text-sm text-slate-800 hover:bg-slate-50",
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
