"use client";

import Link from "next/link";

/**
 * Penangkap ralat default untuk semua halaman dalam (app):
 * /bilik, /my, /admin/*, dll. Halaman yang ada error.tsx sendiri
 * (cth. /dashboard) akan diutamakan.
 *
 * Tujuan utama: elak skrin putih Vercel "Application error" apabila
 * query DB gagal (cold start Supabase/Vercel).
 */
export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="card p-6 space-y-3 border-red-200 bg-red-50/50">
        <h2 className="font-semibold text-red-800">
          Halaman tidak dapat dimuatkan
        </h2>
        <p className="text-sm text-red-700">
          Sambungan pangkalan data mungkin sejuk. Cuba muat semula sebentar
          lagi.
        </p>
        {error?.digest && (
          <p className="text-xs text-red-600/80">
            Kod ralat: <code>{error.digest}</code>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => reset()}
          >
            Cuba lagi
          </button>
          <Link href="/dashboard" prefetch={false} className="btn-secondary">
            Ke Utama
          </Link>
        </div>
      </div>
    </div>
  );
}
