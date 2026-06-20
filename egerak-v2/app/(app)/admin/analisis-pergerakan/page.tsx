import { getAnalisisPergerakanData } from "@/lib/actions/analisis-pergerakan";
import { getUserLaporanSektorScope } from "@/lib/actions/laporan-opr";
import { listAllSektors } from "@/lib/actions/users";
import { intersectSektorIds } from "@/lib/laporan-sektor-scope";
import { requireAnalisisAccess } from "@/lib/rbac";
import { canViewAllAnalisisPergerakan } from "@/lib/roles";
import AnalisisPergerakanClient from "./AnalisisPergerakanClient";

export const dynamic = "force-dynamic";

type SP = {
  range?: string;
  month?: string;
  year?: string;
  sektor?: string;
};

export default async function AnalisisPergerakanPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const user = await requireAnalisisAccess();
  const sp = await searchParams;

  const isKetua = user.peranan === "Ketua_Unit";
  const isTimbalan = user.peranan === "Timbalan_PPD";
  const viewAll = canViewAllAnalisisPergerakan(user.peranan);

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

  const spForData = {
    ...sp,
    sektor: sektorIds.length ? sektorIds.join(",") : undefined,
  };

  const [data, allSektors] = await Promise.all([
    getAnalisisPergerakanData(spForData),
    listAllSektors(),
  ]);

  const filterSektors = allSektors
    .filter((s) => s.code !== "PPD_PENTADBIRAN")
    .filter((s) => (isTimbalan ? timbalanScope.includes(s.id) : true))
    .map((s) => ({ id: s.id, code: s.code, name: s.name }));

  const lockedSektorLabel =
    lockedSektorId != null
      ? (allSektors.find((s) => s.id === lockedSektorId)?.name ?? null)
      : null;

  const timbalanScopeNames = timbalanScope
    .map((id) => allSektors.find((s) => s.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4 overflow-x-hidden">
      <div className="print:hidden">
        <h1 className="text-xl font-semibold">Analisis Pergerakan & OPR</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pilih tab <strong>OPR</strong> atau <strong>Pergerakan</strong>; penapis tempoh & sektor
          dikongsi. <strong>Pergerakan</strong> = satu rekod satu kiraan. <strong>OPR</strong> = satu{" "}
          <strong>OPR siap</strong> satu program (program, fokus…), dikreditkan kepada sektor yang
          menghantar laporan.
        </p>
        {isKetua && lockedSektorLabel && (
          <p className="mt-2 text-sm text-brand-800 bg-brand-50 border border-brand-200 rounded-md px-3 py-2">
            Anda melihat analisis sektor: <strong>{lockedSektorLabel}</strong> sahaja.
          </p>
        )}
        {isTimbalan && timbalanScopeNames.length > 0 && (
          <p className="mt-2 text-sm text-teal-900 bg-teal-50 border border-teal-200 rounded-md px-3 py-2">
            Skop Timbalan PPD: <strong>{timbalanScopeNames.join(" · ")}</strong>
          </p>
        )}
        {noSektorAssigned && (
          <p className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Akaun Ketua Unit belum dikaitkan dengan sektor. Sila hubungi pentadbir.
          </p>
        )}
        {noTimbalanScope && (
          <p className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Akaun Timbalan PPD belum ditetapkan sektor laporan. Sila hubungi pentadbir.
          </p>
        )}
        {viewAll && user.peranan === "Penyelia" && (
          <p className="mt-2 text-sm text-violet-900 bg-violet-50 border border-violet-200 rounded-md px-3 py-2">
            Paparan <strong>semua sektor</strong> PPD.
          </p>
        )}
      </div>

      <AnalisisPergerakanClient
        sektors={filterSektors}
        sektorFilterLocked={isKetua}
        pergerakanAggregates={data.pergerakanAggregates}
        programAggregates={data.programAggregates}
        fokusAggregates={data.fokusAggregates}
        current={{
          range: data.period.range,
          month: data.period.month,
          year: data.period.year,
          periodLabel: data.period.label,
          chartYear: data.chartYear,
          sektorIds,
        }}
      />
    </div>
  );
}
