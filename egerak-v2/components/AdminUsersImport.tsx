"use client";

import { useEffect, useState, useTransition } from "react";
import {
  importUsersCsv,
  type BulkUserImportResult,
} from "@/lib/actions/bulk-user-import";

export const DEFAULT_USER_IMPORT_PASSWORD = "TukarSegera1!";

export default function AdminUsersImport() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BulkUserImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [defaultPassword, setDefaultPassword] = useState(DEFAULT_USER_IMPORT_PASSWORD);

  useEffect(() => {
    if (result || error) setOpen(true);
  }, [result, error]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (defaultPassword.length < 8) {
      setError("Kata laluan lalai minimum 8 aksara");
      return;
    }
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      startTransition(async () => {
        try {
          const r = await importUsersCsv(text, defaultPassword, file.name);
          setResult(r);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Import gagal");
        }
      });
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="group card border-brand-100"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 select-none [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-slate-900">Import Pengguna (CSV)</span>
        <span className="text-xs font-normal text-slate-500 shrink-0">
          <span className="group-open:hidden">Buka</span>
          <span className="hidden group-open:inline">Tutup</span>
        </span>
      </summary>

      <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3">
        <p className="text-sm text-slate-600">
          Username sedia ada akan <strong>dikemas kini</strong>. Akaun baharu guna kata laluan
          lalai di bawah (mesti ditukar pada login pertama).
        </p>
        <p className="text-xs text-slate-500">
          Lajur: <strong>username</strong>, <strong>nama</strong>, <strong>jawatan</strong>,{" "}
          <strong>sektor</strong>, <strong>peranan</strong>. Hanya <strong>username</strong> dan{" "}
          <strong>nama</strong> wajib; peranan kosong = Pengguna.
        </p>

        <div>
          <div className="label">Template CSV</div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/templates/pengguna-kosong.csv"
              download="pengguna-kosong.csv"
              className="btn-secondary text-sm"
            >
              Muat turun — kosong
            </a>
            <a
              href="/templates/pengguna-contoh.csv"
              download="pengguna-contoh.csv"
              className="btn-secondary text-sm"
            >
              Muat turun — contoh
            </a>
            <a
              href="/templates/PANDUAN-CSV-PENGGUNA.md"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm"
            >
              Panduan (BM)
            </a>
          </div>
        </div>

        <div>
          <label className="label">Kata laluan lalai (akaun baharu sahaja)</label>
          <input
            type="password"
            className="input max-w-xs"
            minLength={8}
            value={defaultPassword}
            onChange={(e) => setDefaultPassword(e.target.value)}
            disabled={pending}
            autoComplete="new-password"
          />
          <p className="text-xs text-slate-500 mt-1">
            Minimum 8 aksara. Pengguna sedia ada <strong>tidak</strong> ditukar kata laluan semasa
            import.
          </p>
        </div>

        <div>
          <label className="label">Fail CSV</label>
          <input
            type="file"
            accept=".csv,text/csv"
            className="input"
            disabled={pending}
            onChange={onFile}
          />
        </div>

        {pending && <p className="text-sm text-brand-700">Memproses import…</p>}
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="rounded-md bg-emerald-50 text-emerald-800 py-2">
                <div className="text-xs">Baharu</div>
                <div className="text-2xl font-bold">{result.ok}</div>
              </div>
              <div className="rounded-md bg-sky-50 text-sky-800 py-2">
                <div className="text-xs">Dikemas kini</div>
                <div className="text-2xl font-bold">{result.updated}</div>
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

            <div className="card overflow-x-auto max-h-80 overflow-y-auto p-0">
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
                              : r.status === "UPDATED"
                                ? "bg-sky-100 text-sky-800"
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
    </details>
  );
}
