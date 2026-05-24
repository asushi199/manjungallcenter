"use client";

import Link from "next/link";
import { useEffect } from "react";

type Props = {
  pergerakanId: number;
};

export default function PrintToolbar({ pergerakanId }: Props) {
  useEffect(() => {
    document.body.classList.add("opr-print-page");
    return () => document.body.classList.remove("opr-print-page");
  }, []);

  const backHref = `/my/${pergerakanId}/opr`;

  return (
    <div className="print:hidden sticky top-0 z-10 bg-slate-800 text-white px-4 py-2 flex items-center justify-between gap-3">
      <Link
        href={backHref}
        className="rounded bg-white/15 hover:bg-white/25 px-3 py-1.5 text-sm font-medium whitespace-nowrap"
      >
        ← Kembali ke OPR
      </Link>
      <span className="text-sm text-center flex-1 hidden sm:block">Pratonton cetakan OPR</span>
      <button
        type="button"
        className="rounded bg-white text-slate-900 px-4 py-1.5 text-sm font-medium whitespace-nowrap"
        onClick={() => window.print()}
      >
        Cetak / Simpan PDF
      </button>
    </div>
  );
}
