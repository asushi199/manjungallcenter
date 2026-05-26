import { requireUser } from "@/lib/rbac";
import { LOKASI_PRESETS } from "@/lib/pergerakan-presets";
import PergerakanForm from "./PergerakanForm";

export const dynamic = "force-dynamic";

export default async function NewPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-semibold mb-1">Isi Pergerakan</h1>
      <p className="text-sm text-slate-500 mb-4">
        Maklumat pegawai akan diambil dari profil anda ({user.nama}).
      </p>
      <div className="card p-4">
        <PergerakanForm lokasiPresets={LOKASI_PRESETS} />
      </div>
    </div>
  );
}
