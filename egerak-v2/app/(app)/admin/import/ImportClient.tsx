"use client";

import { useState, useTransition } from "react";
import {
  importRancanganCsv,
  importRancanganXlsx,
  type BulkImportResult,
} from "@/lib/actions/bulk-import";

function isXlsxFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".xlsx") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

export default function ImportClient() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);

    const reader = new FileReader();
    const xlsx = isXlsxFile(file);
    reader.onload = () => {
      startTransition(async () => {
        try {
          const raw = String(reader.result ?? "");
          const imported = xlsx
            ? await importRancanganXlsx(raw.split(",")[1] ?? "", file.name)
            : await importRancanganCsv(raw, file.name);
          setResult(imported);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Import gagal");
        }
      });
    };

    if (xlsx) reader.readAsDataURL(file);
    else reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div>
          <div className="label">Template rasmi Excel (untuk edar pegawai)</div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/templates/rancangan-tahunan"
              download="rancangan-tahunan.xlsx"
              className="btn-primary text-sm"
            >
              Muat turun template Excel
            </a>
          </div>
        </div>

        <div>
          <label className="label">Fail Excel / CSV untuk import</label>
          <input
            type="file"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="input"
            disabled={pending}
            onChange={onFile}
          />
          <p className="text-xs text-slate-500 mt-2">
            Lajur wajib: <strong>Aktiviti</strong>, <strong>Tarikh Mula</strong>,{" "}
            <strong>Tarikh Tamat</strong>, <strong>Sektor</strong>. Tiada lajur pegawai — pegawai
            sendiri ambil aktiviti di Daftar Pergerakan. Tarikh rasmi: <strong>2026-06-14</strong>{" "}
            atau <strong>2026-06-14 08:00</strong>.
          </p>
        </div>
      </div>

      {pending && <p className="text-sm text-brand-700">Memproses import...</p>}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {result.dateFormatWarnings.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-950 text-sm px-3 py-2 space-y-1">
              <p className="font-semibold">Amaran format tarikh (Excel)</p>
              <ul className="list-disc list-inside text-xs">
                {result.dateFormatWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              <p className="text-xs mt-1">
                Minta pegawai guna <strong>yyyy-mm-dd</strong> dan format lajur tarikh sebagai teks.
              </p>
            </div>
          )}

          <div className="card p-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-emerald-50 text-emerald-800 py-2">
              <div className="text-xs">OK</div>
              <div className="text-2xl font-bold">{result.ok}</div>
            </div>
            <div className="rounded-md bg-red-50 text-red-800 py-2">
              <div className="text-xs">Ralat</div>
              <div className="text-2xl font-bold">{result.error}</div>
            </div>
            <div className="rounded-md bg-slate-100 text-slate-700 py-2">
              <div className="text-xs">Langkau</div>
              <div className="text-2xl font-bold">{result.skipped}</div>
            </div>
          </div>

          <div className="card overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Baris</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Mesej</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.line} className="border-t">
                    <td className="px-3 py-1">{r.line}</td>
                    <td className="px-3 py-1">
                      <span
                        className={
                          "badge " +
                          (r.status === "OK"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "ERROR"
                              ? "bg-red-100 text-red-800"
                              : "bg-slate-100 text-slate-600")
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-1 text-slate-600">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
