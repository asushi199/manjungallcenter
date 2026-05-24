"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/admin/laporan-opr", label: "Laporan OPR" },
  { href: "/admin/users", label: "Pengguna" },
  { href: "/admin/import", label: "Import Rancangan" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            path === l.href || path?.startsWith(`${l.href}/`)
              ? "bg-brand-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
