import { listAllPergerakanAdmin } from "@/lib/actions/pergerakan";
import { requireAdmin } from "@/lib/rbac";
import AdminPergerakanClient from "./AdminPergerakanClient";

export const dynamic = "force-dynamic";

export default async function AdminPergerakanPage() {
  await requireAdmin();
  const items = await listAllPergerakanAdmin();

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Padam Pergerakan (Admin)</h1>
        <p className="text-sm text-slate-500">
          Senarai semua pergerakan aktif dalam sistem — untuk bersihkan data ujian atau rekod
          silap.
        </p>
      </div>
      <AdminPergerakanClient
        items={items.map((it) => ({
          ...it,
          tarikhPergi: it.tarikhPergi.toISOString(),
          tarikhKembali: it.tarikhKembali.toISOString(),
        }))}
      />
    </div>
  );
}
