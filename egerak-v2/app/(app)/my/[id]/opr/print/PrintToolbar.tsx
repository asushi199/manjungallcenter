"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ToolbarNavDropdown from "@/components/ToolbarNavDropdown";
import { navLinksForPeranan, type AppNavLink } from "@/lib/app-nav";

type Props = {
  pergerakanId: number;
};

export default function PrintToolbar({ pergerakanId }: Props) {
  const { data } = useSession();
  const router = useRouter();
  useEffect(() => {
    document.body.classList.add("opr-print-page");
    return () => document.body.classList.remove("opr-print-page");
  }, []);

  const backHref = `/my/${pergerakanId}/opr`;
  const menuLinks: AppNavLink[] = [
    { href: backHref, label: "← Kembali ke OPR" },
    ...navLinksForPeranan(data?.user?.peranan ?? "Pengguna"),
  ];

  function handleTutup() {
    // Dibuka dalam tab baharu (cth. dari Laporan OPR) — tutup terus.
    window.close();
    // Fallback: jika tab tak boleh ditutup (tab utama), patah balik ke borang OPR.
    setTimeout(() => {
      if (!window.closed) router.push(backHref);
    }, 150);
  }

  return (
    <div className="print:hidden sticky top-0 z-10 bg-slate-800 text-white px-4 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <ToolbarNavDropdown label="Menu" links={menuLinks} />
        <button
          type="button"
          className="rounded border border-white/40 px-3 py-1.5 text-sm font-medium whitespace-nowrap hover:bg-white/10"
          onClick={handleTutup}
        >
          ✕ Tutup
        </button>
      </div>
      <span className="text-sm text-center flex-1 hidden sm:block">Pratonton cetakan OPR</span>
      <button
        type="button"
        className="rounded bg-white text-slate-900 px-4 py-1.5 text-sm font-medium whitespace-nowrap shrink-0"
        onClick={() => window.print()}
      >
        Cetak / Simpan PDF
      </button>
    </div>
  );
}
