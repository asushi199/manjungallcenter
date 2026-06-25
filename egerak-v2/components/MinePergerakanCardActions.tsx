"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { markOprTiada, reopenOprFromTiada } from "@/lib/actions/opr";
import { needsOprAction, type OprStatus } from "@/lib/opr-status";

type Props = {
  pergerakanId: number;
  jenis: "Pergerakan" | "Bercuti";
  oprStatus?: OprStatus | null;
  /** Halaman asal — supaya OPR boleh patah balik ke sini (lalai /my). */
  backTo?: string;
};

export default function MinePergerakanCardActions({
  pergerakanId,
  jenis,
  oprStatus,
  backTo = "/my",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dlState, setDlState] = useState<"idle" | "loading" | "done" | "error">("idle");

  if (jenis === "Bercuti") {
    return null;
  }

  const oprHref = `/my/${pergerakanId}/opr?from=${encodeURIComponent(backTo)}`;

  const showPerlu = needsOprAction(jenis, oprStatus);
  const isTiada = oprStatus === "TIADA";
  const isSiap = oprStatus === "SIAP";

  function onMarkTiada() {
    if (
      !confirm(
        "Tandakan OPR tidak diperlukan untuk aktiviti ini? (Laporan oleh penganjur / rakan sektor.)",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await markOprTiada(pergerakanId);
      if (!res.ok) alert(res.error ?? "Gagal menanda Tiada OPR");
      else router.refresh();
    });
  }

  function onReopen() {
    startTransition(async () => {
      const res = await reopenOprFromTiada(pergerakanId);
      if (!res.ok) alert(res.error ?? "Gagal membuka semula OPR");
      else router.refresh();
    });
  }

  const lampiranHref = `/api/pergerakan/${pergerakanId}/lampiran-a`;

  async function handleDownload() {
    if (dlState === "loading") return;
    setDlState("loading");
    try {
      const res = await fetch(lampiranHref);
      if (!res.ok) throw new Error("Gagal");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
      a.href = url;
      a.download = match?.[1] ? decodeURIComponent(match[1]) : `Lampiran-A-${pergerakanId}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setDlState("done");
      setTimeout(() => setDlState("idle"), 3000);
    } catch {
      setDlState("error");
      setTimeout(() => setDlState("idle"), 3000);
    }
  }

  const dlLabel =
    dlState === "loading" ? "Memuat turun…" :
    dlState === "done" ? "Selesai ✓" :
    dlState === "error" ? "Gagal ✗" :
    "Lampiran A";

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={handleDownload}
        disabled={dlState === "loading"}
        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        title="Muat turun Lampiran A (borang permohonan keluar)"
        data-no-toggle
      >
        {dlState === "loading" ? (
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden className="shrink-0 animate-spin text-blue-700">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4" strokeDashoffset="10" />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            aria-hidden
            className={`shrink-0 ${dlState === "done" ? "text-green-600" : dlState === "error" ? "text-red-500" : "text-blue-700"}`}
          >
            <path
              fill="currentColor"
              d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5L14 3.5zM8 12v6h8v-6H8zm1 1h6v4H9v-4z"
            />
          </svg>
        )}
        {dlLabel}
      </button>
      {showPerlu ? (
        <>
          <Link
            href={oprHref}
            className="btn-primary text-[11px] py-1 px-2.5 min-h-0"
          >
            Isi OPR
          </Link>
          <button
            type="button"
            className="btn-secondary text-[11px] py-1 px-2.5 min-h-0 border-slate-300 font-medium"
            disabled={pending}
            onClick={onMarkTiada}
          >
            {pending ? "…" : "Tidak perlu OPR"}
          </button>
        </>
      ) : null}

      {isTiada ? (
        <>
          <Link
            href={oprHref}
            className="btn-secondary text-[11px] py-1 px-2.5 min-h-0"
          >
            OPR — Tiada
          </Link>
          <button
            type="button"
            className="text-[11px] py-1 px-2.5 min-h-0 text-slate-600 underline hover:text-slate-900 disabled:opacity-50"
            disabled={pending}
            onClick={onReopen}
          >
            {pending ? "…" : "Buka semula OPR"}
          </button>
        </>
      ) : null}

      {isSiap ? (
        <Link
          href={oprHref}
          className="btn-secondary text-[11px] py-1 px-2.5 min-h-0"
        >
          Lihat OPR
        </Link>
      ) : null}
    </div>
  );
}
