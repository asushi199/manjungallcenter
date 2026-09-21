import { requireAdmin } from "@/lib/rbac";
import { loadBackupPageData } from "@/lib/actions/backup";
import SandaranClient from "./SandaranClient";
import BackupPgDumpSection from "@/components/admin/BackupPgDumpSection";

export const dynamic = "force-dynamic";

export default async function AdminSandaranPage() {
  await requireAdmin();
  const data = await loadBackupPageData();

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Sandaran Pangkalan Data</h1>
        <p className="text-sm text-slate-500">
          Muat turun salinan semua data sistem, atau simpan ke Drive pejabat. Hidupkan sandaran
          automatik supaya salinan baharu dibuat sendiri pada waktu malam.
        </p>
      </div>
      <SandaranClient
        settings={data.settings}
        driveConfigured={data.driveConfigured}
        cronConfigured={data.cronConfigured}
        lastDriveAt={data.lastDriveAt}
        runs={data.runs}
      />
      <BackupPgDumpSection />
    </div>
  );
}
