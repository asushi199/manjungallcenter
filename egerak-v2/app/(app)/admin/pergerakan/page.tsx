import { listPergerakanForSectorAdmin } from "@/lib/actions/pergerakan";
import { listAllSektors } from "@/lib/actions/users";
import { requireSectorPergerakanAdmin } from "@/lib/rbac";
import { isFullAdmin } from "@/lib/roles";
import AdminPergerakanClient from "./AdminPergerakanClient";

export const dynamic = "force-dynamic";

type SP = { year?: string };

export default async function AdminPergerakanPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const currentYear = new Date().getFullYear();
  const yearParam = sp.year;
  const year = yearParam === "all" ? undefined : Number(yearParam || currentYear);
  const user = await requireSectorPergerakanAdmin();
  const isAdmin = isFullAdmin(user.peranan);
  const isKetua = user.peranan === "Ketua_Unit";
  const isTimbalan = user.peranan === "Timbalan_PPD";

  const lockedSektorId =
    user.sektorId != null && Number.isFinite(Number(user.sektorId))
      ? Number(user.sektorId)
      : null;

  const allSektors = await listAllSektors();
  const lockedSektorLabel =
    isKetua && lockedSektorId
      ? (allSektors.find((s) => s.id === lockedSektorId)?.name ?? null)
      : null;

  const items = await listPergerakanForSectorAdmin(year);

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">
          {isAdmin ? "Padam Pergerakan (Admin)" : "Padam Pergerakan (Sektor)"}
        </h1>
        <p className="text-sm text-slate-500">
          {isAdmin
            ? "Senarai semua pergerakan aktif dalam sistem — untuk bersihkan data ujian atau rekod silap."
            : "Senarai pergerakan aktif dalam skop sektor anda sahaja."}
        </p>
        {isKetua && lockedSektorLabel && (
          <p className="mt-2 text-sm text-brand-800 bg-brand-50 border border-brand-200 rounded-md px-3 py-2">
            Skop: <strong>{lockedSektorLabel}</strong>
          </p>
        )}
        {isTimbalan && (
          <p className="mt-2 text-sm text-teal-900 bg-teal-50 border border-teal-200 rounded-md px-3 py-2">
            Anda boleh melihat pergerakan <strong>semua sektor</strong>.
          </p>
        )}
        {isKetua && !lockedSektorId && (
          <p className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Akaun Ketua Unit belum dikaitkan dengan sektor. Hubungi pentadbir.
          </p>
        )}
      </div>
      <AdminPergerakanClient
        items={items.map((it) => ({
          ...it,
          tarikhPergi: it.tarikhPergi.toISOString(),
          tarikhKembali: it.tarikhKembali.toISOString(),
        }))}
        year={year ?? "all"}
        currentYear={currentYear}
      />
    </div>
  );
}
