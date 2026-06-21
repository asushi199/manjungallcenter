import { requireUser } from "@/lib/rbac";
import { LOKASI_PRESETS } from "@/lib/pergerakan-presets";
import { listRooms } from "@/lib/actions/rooms";
import PergerakanForm from "./PergerakanForm";

export const dynamic = "force-dynamic";

export default async function NewPage() {
  await requireUser();
  const rooms = await listRooms();
  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-semibold mb-4">Isi Pergerakan</h1>
      <div className="card p-4">
        <PergerakanForm lokasiPresets={LOKASI_PRESETS} rooms={rooms} />
      </div>
    </div>
  );
}
