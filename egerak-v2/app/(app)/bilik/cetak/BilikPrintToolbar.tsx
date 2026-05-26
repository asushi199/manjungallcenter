"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  month: string;
};

export default function BilikPrintToolbar({ month }: Props) {
  const router = useRouter();

  useEffect(() => {
    document.body.classList.add("bilik-print-page");
    return () => document.body.classList.remove("bilik-print-page");
  }, []);

  return (
    <div className="print:hidden sticky top-0 z-10 bg-slate-800 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-3">
      <Link href="/bilik" className="text-sm text-white/90 hover:text-white shrink-0">
        ← Kembali ke Tempahan
      </Link>
      <label className="flex items-center gap-2 text-sm shrink-0">
        <span className="text-white/80">Bulan</span>
        <input
          type="month"
          className="rounded px-2 py-1 text-slate-900 text-sm"
          value={month}
          onChange={(e) => {
            const v = e.target.value;
            if (v && /^\d{4}-\d{2}$/.test(v)) router.push(`/bilik/cetak?month=${v}`);
          }}
        />
      </label>
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
