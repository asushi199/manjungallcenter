import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrCreateOpr } from "@/lib/actions/opr";
import { requireUser } from "@/lib/rbac";
import { formatDateTime } from "@/lib/dates";
import { oprPhotoDisplayUrl } from "@/lib/opr-photo-url";
import { getStorageSetupHint, isStorageConfigured } from "@/lib/storage";
import { oprStatusBadge } from "@/lib/opr-status";
import OprFormClient from "./OprFormClient";

export const dynamic = "force-dynamic";

/** Vercel Pro: hingga 60s; Hobby kekal ~10s. Kurangkan 504 jika Gemini perlahan. */
export const maxDuration = 30;

export default async function OprPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const pergerakanId = Number(id);
  if (!Number.isFinite(pergerakanId)) notFound();

  // Hanya benarkan laluan dalaman (elak open redirect).
  const { from } = await searchParams;
  const returnTo = from && from.startsWith("/") && !from.startsWith("//") ? from : "/my";
  const returnLabel = returnTo.startsWith("/dashboard") ? "Utama" : "Pergerakan Saya";

  let data;
  try {
    data = await getOrCreateOpr(pergerakanId);
  } catch {
    notFound();
  }

  const p = data.pergerakan;
  const o = data.opr;
  const statusBadge = oprStatusBadge(o.status);

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href={returnTo} className="text-sm text-brand-600 hover:underline">
            ← {returnLabel}
          </Link>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h1 className="text-xl font-semibold">OPR Pelaksanaan Program / Aktiviti</h1>
            {statusBadge ? (
              <span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span>
            ) : null}
          </div>
          <p className="text-sm text-slate-500">
            {p.urusan} · {formatDateTime(p.tarikhPergi)} · {p.lokasi || "-"}
          </p>
        </div>
        <Link
          href={`/my/${pergerakanId}/opr/print`}
          target="_blank"
          className="btn-secondary"
        >
          Cetak / PDF
        </Link>
      </div>

      <OprFormClient
        pergerakanId={pergerakanId}
        returnTo={returnTo}
        returnLabel={returnLabel}
        profileSektorName={p.sektor?.name ?? "—"}
        initial={{
          sektorOverrideId: o.sektorOverrideId,
          fokus: o.fokus ?? "",
          maklumatTambahan: o.maklumatTambahan ?? "",
          sasaran: o.sasaran ?? "",
          notaPegawai: o.notaPegawai ?? "",
          dapatan: o.dapatan ?? "",
          rumusan: o.rumusan ?? "",
          refleksi: o.refleksi ?? "",
          status: o.status,
          aiGenerateInputKey: o.aiGenerateInputKey ?? null,
        }}
        photos={(o.photos ?? []).map((ph) => ({
          id: ph.id,
          displayUrl: oprPhotoDisplayUrl(ph, 400),
          publicUrl: ph.publicUrl,
          storagePath: ph.storagePath,
        }))}
        storageEnabled={isStorageConfigured()}
        storageHint={getStorageSetupHint()}
      />
    </div>
  );
}
