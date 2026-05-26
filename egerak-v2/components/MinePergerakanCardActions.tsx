"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markOprTiada, reopenOprFromTiada } from "@/lib/actions/opr";
import { needsOprAction, type OprStatus } from "@/lib/opr-status";

type Props = {
  pergerakanId: number;
  jenis: "Pergerakan" | "Bercuti";
  oprStatus?: OprStatus | null;
};

export default function MinePergerakanCardActions({
  pergerakanId,
  jenis,
  oprStatus,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (jenis === "Bercuti") {
    return (
      <div className="flex flex-wrap gap-2 pt-1 border-t border-white/60">
        <Link
          href={`/my/${pergerakanId}/edit`}
          className="btn-secondary text-xs py-1.5 px-3 min-h-0"
        >
          Edit
        </Link>
      </div>
    );
  }

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

  return (
    <div className="flex flex-wrap gap-2 pt-1 border-t border-white/60">
      <Link
        href={`/my/${pergerakanId}/edit`}
        className="btn-secondary text-xs py-1.5 px-3 min-h-0"
      >
        Edit
      </Link>

      {showPerlu ? (
        <>
          <Link
            href={`/my/${pergerakanId}/opr`}
            className="btn-primary text-xs py-1.5 px-3 min-h-0"
          >
            Isi OPR
          </Link>
          <button
            type="button"
            className="btn-secondary text-xs py-1.5 px-3 min-h-0 border-slate-400 font-medium"
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
            href={`/my/${pergerakanId}/opr`}
            className="btn-secondary text-xs py-1.5 px-3 min-h-0"
          >
            OPR — Tiada
          </Link>
          <button
            type="button"
            className="text-xs py-1.5 px-3 min-h-0 text-slate-600 underline hover:text-slate-900 disabled:opacity-50"
            disabled={pending}
            onClick={onReopen}
          >
            {pending ? "…" : "Buka semula OPR"}
          </button>
        </>
      ) : null}

      {isSiap ? (
        <Link
          href={`/my/${pergerakanId}/opr`}
          className="btn-secondary text-xs py-1.5 px-3 min-h-0"
        >
          Lihat OPR
        </Link>
      ) : null}
    </div>
  );
}
