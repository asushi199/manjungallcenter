import { listPendingBookingRequests } from "@/lib/actions/rooms";
import { requireAdmin } from "@/lib/rbac";
import BilikPermohonanClient from "./BilikPermohonanClient";

export const dynamic = "force-dynamic";

export default async function BilikPermohonanPage() {
  await requireAdmin();
  const requests = await listPendingBookingRequests();

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Permohonan Tempahan Bilik</h1>
        <p className="text-sm text-slate-500">
          Permohonan batal / ubah yang melepasi tempoh 24 jam. Tempahan asal kekal sehingga
          anda meluluskan.
        </p>
      </div>
      <BilikPermohonanClient
        requests={requests.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          currentTarikh: String(r.currentTarikh),
          newTarikh: r.newTarikh ? String(r.newTarikh) : null,
        }))}
      />
    </div>
  );
}
