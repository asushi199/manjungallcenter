import { getAnalisisPergerakanData } from "@/lib/actions/analisis-pergerakan";
import { listAllSektors } from "@/lib/actions/users";
import { requireAnalisisAccess } from "@/lib/rbac";
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
  await requireAnalisisAccess();
  const sp = await searchParams;

  const sektorIds = (sp.sektor ?? "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);

  const [data, allSektors] = await Promise.all([
    getAnalisisPergerakanData(sp),
    listAllSektors(),
  ]);

  const filterSektors = allSektors
    .filter((s) => s.code !== "PPD_PENTADBIRAN")
    .map((s) => ({ id: s.id, code: s.code, name: s.name }));

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Analisis Pergerakan / Program</h1>
        <p className="text-sm text-slate-500 mt-1">
          Statistik pergerakan biasa sahaja (cuti / Bercuti tidak dikira). Program
          dengan lokasi & urusan yang hampir sama pada hari sama dikira sekali.
        </p>
      </div>

      <AnalisisPergerakanClient
        sektors={filterSektors}
        aggregates={data.aggregates}
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
