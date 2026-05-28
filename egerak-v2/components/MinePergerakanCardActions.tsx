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
    return null;
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
    <div className="mt-1 flex flex-wrap gap-1.5">
      {showPerlu ? (
        <>
          <Link
            href={`/my/${pergerakanId}/opr`}
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
            href={`/my/${pergerakanId}/opr`}
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
          href={`/my/${pergerakanId}/opr`}
          className="btn-secondary text-[11px] py-1 px-2.5 min-h-0"
        >
          Lihat OPR
        </Link>
      ) : null}
    </div>
  );
}
