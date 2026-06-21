"use client";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="card p-6 space-y-3 border-red-200 bg-red-50/50">
        <h2 className="font-semibold text-red-800">Utama tidak dapat dimuatkan</h2>
        <p className="text-sm text-red-700">Cuba muat semula sebentar lagi.</p>
        <button type="button" className="btn-primary" onClick={() => reset()}>
          Cuba lagi
        </button>
      </div>
    </div>
  );
}
