import { requireImportRancanganAccess } from "@/lib/rbac";
import { isFullAdmin } from "@/lib/roles";
import ImportClient from "./ImportClient";

export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  const user = await requireImportRancanganAccess();
  const isAdmin = isFullAdmin(user.peranan);

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Import Rancangan Tahunan</h1>
        <p className="text-sm text-slate-500">
          Muat turun template Excel, isi maklumat, kemudian muat naik fail.
        </p>
        {!isAdmin && (
          <p className="mt-2 text-sm text-sky-900 bg-sky-50 border border-sky-200 rounded-md px-3 py-2">
            Import hanya untuk rekod dalam <strong>skop sektor anda</strong>. Baris di luar skop
            akan ditandakan ralat.
          </p>
        )}
      </div>
      <ImportClient />
    </div>
  );
}
