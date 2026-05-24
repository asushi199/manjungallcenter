import { getUserLaporanSektorScope, listSiapOprLaporan } from "@/lib/actions/laporan-opr";
import { listAllSektors } from "@/lib/actions/users";
import { intersectSektorIds } from "@/lib/laporan-sektor-scope";
import { resolveLaporanOprPeriod } from "@/lib/laporan-opr-period";
import { requireLaporanOprAccess } from "@/lib/rbac";
import LaporanOprClient from "./LaporanOprClient";

export const dynamic = "force-dynamic";

type SP = { range?: string; month?: string; year?: string; sektor?: string; q?: string };

export default async function LaporanOprPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const user = await requireLaporanOprAccess();
  const sp = await searchParams;
  const period = resolveLaporanOprPeriod(sp);

  const isKetua = user.peranan === "Ketua_Unit";
  const isTimbalan = user.peranan === "Timbalan_PPD";

  const lockedSektorId =
    user.sektorId != null && Number.isFinite(Number(user.sektorId))
      ? Number(user.sektorId)
      : null;
  const noSektorAssigned = isKetua && lockedSektorId == null;

  const timbalanScope = isTimbalan ? await getUserLaporanSektorScope(Number(user.id)) : [];
  const noTimbalanScope = isTimbalan && timbalanScope.length === 0;

  let sektorIds = (sp.sektor ?? "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (isKetua && lockedSektorId) {
    sektorIds = [lockedSektorId];
  } else if (isTimbalan && timbalanScope.length) {
    sektorIds = intersectSektorIds(sektorIds.length ? sektorIds : undefined, timbalanScope);
  }

  const q = sp.q ?? "";

  const allSektors = await listAllSektors();
  const filterSektors = isTimbalan
    ? allSektors.filter((s) => timbalanScope.includes(s.id))
    : allSektors;

  const rows =
    noSektorAssigned || noTimbalanScope
      ? []
      : await listSiapOprLaporan({
          start: period.start,
          end: period.end,
          sektorIds: sektorIds.length ? sektorIds : undefined,
        });

  const lockedSektorLabel =
    lockedSektorId != null
      ? (allSektors.find((s) => s.id === lockedSektorId)?.name ?? null)
      : null;

  const timbalanScopeNames = timbalanScope
    .map((id) => allSektors.find((s) => s.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Laporan OPR PPD</h1>
        <p className="text-sm text-slate-500">
          Ringkasan laporan pelaksanaan yang telah ditandakan siap. Klik pautan untuk pratonton atau
          cetak laporan penuh.
        </p>
        {isKetua && lockedSektorLabel && (
          <p className="mt-2 text-sm text-brand-800 bg-brand-50 border border-brand-200 rounded-md px-3 py-2">
            Anda melihat laporan sektor: <strong>{lockedSektorLabel}</strong> sahaja.
          </p>
        )}
        {isTimbalan && timbalanScopeNames.length > 0 && (
          <p className="mt-2 text-sm text-teal-900 bg-teal-50 border border-teal-200 rounded-md px-3 py-2">
            Skop Timbalan PPD: <strong>{timbalanScopeNames.join(" · ")}</strong>
          </p>
        )}
        {noSektorAssigned && (
          <p className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Akaun Ketua Unit anda belum dikaitkan dengan sektor. Sila hubungi pentadbir untuk
            kemas kini profil.
          </p>
        )}
        {noTimbalanScope && (
          <p className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Akaun Timbalan PPD belum ditetapkan sektor laporan. Sila hubungi pentadbir.
          </p>
        )}
      </div>
      <LaporanOprClient
        rows={rows.map((r) => ({
          ...r,
          tarikhPergi: r.tarikhPergi.toISOString(),
          tarikhKembali: r.tarikhKembali.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }))}
        sektors={filterSektors.map((s) => ({ id: s.id, code: s.code, name: s.name }))}
        sektorFilterLocked={isKetua}
        current={{
          range: period.range,
          month: period.month,
          year: period.year,
          periodLabel: period.label,
          sektorIds,
          q,
        }}
      />
    </div>
  );
}
