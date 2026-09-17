"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { backupToDriveNow, saveBackupSettings, type BackupSettings } from "@/lib/actions/backup";
import { formatDateTime } from "@/lib/dates";

type Run = {
  id: number;
  ok: boolean;
  createdAt: string;
  trigger: "manual" | "cron" | null;
  destination: "download" | "drive" | null;
  filename: string;
  byteSize: number;
  error: string | null;
};

function formatBytes(n: number): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function triggerLabel(trigger: Run["trigger"], destination: Run["destination"]): string {
  if (trigger === "cron") return "Automatik";
  if (destination === "drive") return "Drive";
  if (destination === "download") return "Muat turun";
  return "—";
}

export default function SandaranClient({
  settings,
  driveConfigured,
  cronConfigured,
  lastDriveAt,
  runs,
}: {
  settings: BackupSettings;
  driveConfigured: boolean;
  cronConfigured: boolean;
  lastDriveAt: string | null;
  runs: Run[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [downloading, setDownloading] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(settings.autoEnabled);
  const [freq, setFreq] = useState(settings.interval);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadNow() {
    setError(null);
    setMessage(null);
    setDownloading(true);
    try {
      const res = await fetch("/api/admin/backup", { cache: "no-store" });
      const cd = res.headers.get("Content-Disposition") ?? "";
      if (!res.ok || !cd.includes("filename=")) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error || "Muat turun gagal");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const match = /filename="([^"]+)"/.exec(cd);
      a.href = url;
      a.download = match?.[1] ?? "egerak-backup.json.gz";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage("Sandaran dimuat turun. Simpan fail di tempat selamat.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Muat turun gagal");
    } finally {
      setDownloading(false);
    }
  }

  function saveToDrive() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await backupToDriveNow();
      if (!result.ok) {
        setError(result.error);
        router.refresh();
        return;
      }
      setMessage(`Sandaran disimpan ke Drive pejabat (${result.filename}).`);
      router.refresh();
    });
  }

  function saveAuto() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveBackupSettings({ autoEnabled, interval: freq });
      if (!result.ok) {
        setError(result.error);
        router.refresh();
        return;
      }
      setMessage(
        autoEnabled
          ? `Sandaran automatik dihidupkan (${freq === "weekly" ? "setiap minggu" : "setiap hari"}).`
          : "Sandaran automatik dimatikan.",
      );
      router.refresh();
    });
  }

  const busy = pending || downloading;

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          {message}
        </p>
      )}

      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-slate-800">Sandaran sekarang</h2>
        <p className="text-sm text-slate-600">
          Fail mengandungi semua rekod sistem termasuk maklumat akaun. Simpan di folder selamat
          pejabat; jangan kongsi pautan awam.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary text-sm" disabled={busy} onClick={downloadNow}>
            {downloading ? "Menyediakan fail…" : "Muat turun sekarang"}
          </button>
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={busy || !driveConfigured}
            onClick={saveToDrive}
          >
            {pending ? "Menyimpan…" : "Simpan ke Drive pejabat"}
          </button>
        </div>
        {!driveConfigured && (
          <p className="text-xs text-slate-500">
            Simpan ke Drive belum sedia. Muat turun manual masih boleh digunakan.
          </p>
        )}
      </div>

      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-slate-800">Sandaran automatik</h2>
        <p className="text-sm text-slate-600">
          Jika dihidupkan, sistem menyimpan salinan ke Drive pejabat pada waktu malam. Hanya 14
          fail Drive terkini dikekalkan.
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-800">
          <input
            type="checkbox"
            className="rounded border-slate-300"
            checked={autoEnabled}
            disabled={busy || !driveConfigured}
            onChange={(e) => setAutoEnabled(e.target.checked)}
          />
          Hidupkan sandaran automatik
        </label>
        <div>
          <label className="label" htmlFor="backup-interval">
            Kekerapan
          </label>
          <select
            id="backup-interval"
            className="input max-w-xs"
            value={freq}
            disabled={busy || !driveConfigured}
            onChange={(e) => setFreq(e.target.value as BackupSettings["interval"])}
          >
            <option value="daily">Setiap hari</option>
            <option value="weekly">Setiap minggu</option>
          </select>
        </div>
        <button
          type="button"
          className="btn-primary text-sm"
          disabled={busy || !driveConfigured}
          onClick={saveAuto}
        >
          Simpan tetapan
        </button>
        <p className="text-xs text-slate-500">
          Sandaran Drive terakhir:{" "}
          {lastDriveAt ? formatDateTime(lastDriveAt) : "belum pernah"}
          {!cronConfigured && autoEnabled
            ? ". Jika automatik tidak berjalan, minta pentadbir teknikal semak tetapan sistem."
            : "."}
        </p>
      </div>

      <div className="card overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Sejarah sandaran</h2>
        </div>
        {runs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">Belum ada rekod sandaran.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 bg-slate-50">
              <tr>
                <th className="px-4 py-2 font-medium">Masa</th>
                <th className="px-4 py-2 font-medium">Jenis</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Saiz</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(run.createdAt)}</td>
                  <td className="px-4 py-2">{triggerLabel(run.trigger, run.destination)}</td>
                  <td className="px-4 py-2">
                    {run.ok ? (
                      <span className="text-emerald-700">{run.filename || "Berjaya"}</span>
                    ) : (
                      <span className="text-red-700">{run.error || "Gagal"}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{formatBytes(run.byteSize)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
