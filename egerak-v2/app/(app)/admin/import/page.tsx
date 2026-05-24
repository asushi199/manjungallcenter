import AdminNav from "@/components/AdminNav";
import { requireAdmin } from "@/lib/rbac";
import ImportClient from "./ImportClient";

export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4">
      <AdminNav />
      <div>
        <h1 className="text-xl font-semibold">Import Rancangan Tahunan</h1>
        <p className="text-sm text-slate-500">
          Muat turun template CSV untuk pegawai, kemudian muat naik fail yang telah diisi. Rujuk
          panduan dalam halaman import atau{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">docs/BULK_IMPORT.md</code>.
        </p>
      </div>
      <ImportClient />
    </div>
  );
}
