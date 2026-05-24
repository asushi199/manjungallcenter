"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/admin/laporan-opr", label: "Laporan OPR", short: "OPR" },
  { href: "/admin/pergerakan", label: "Padam Pergerakan", short: "Padam" },
  { href: "/admin/users", label: "Pengguna", short: "Pengguna" },
  { href: "/admin/import", label: "Import Rancangan", short: "Import" },
] as const;

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav
      className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-thin border-b border-slate-200"
      aria-label="Navigasi pentadbir"
    >
      {LINKS.map((l) => {
        const active = path === l.href || path?.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap shrink-0",
              active
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            )}
          >
            <span className="sm:hidden">{l.short}</span>
            <span className="hidden sm:inline">{l.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
