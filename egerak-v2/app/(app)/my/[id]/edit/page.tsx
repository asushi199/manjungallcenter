import { notFound } from "next/navigation";
import { getPergerakanForEdit } from "@/lib/actions/pergerakan";
import { LOKASI_PRESETS } from "@/lib/pergerakan-presets";
import PergerakanForm from "@/app/(app)/new/PergerakanForm";

export const dynamic = "force-dynamic";

export default async function EditPergerakanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) notFound();

  const data = await getPergerakanForEdit(numId);
  if (!data) notFound();

  // Hanya benarkan laluan dalaman (elak open redirect).
  const { from } = await searchParams;
  const returnTo = from && from.startsWith("/") && !from.startsWith("//") ? from : "/my";

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-semibold mb-1">Kemaskini Pergerakan</h1>
      <p className="text-sm text-slate-500 mb-4">
        Ubah maklumat di bawah. Tempahan bilik/dewan (jika berkenaan) akan diselaraskan semula.
      </p>
      <div className="card p-4">
        <PergerakanForm
          lokasiPresets={LOKASI_PRESETS}
          mode="edit"
          editId={data.id}
          initial={data}
          returnTo={returnTo}
        />
      </div>
    </div>
  );
}
