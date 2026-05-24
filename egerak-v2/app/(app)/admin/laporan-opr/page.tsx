import AdminNav from "@/components/AdminNav";
import { listSiapOprLaporan } from "@/lib/actions/laporan-opr";
import { listAllSektors } from "@/lib/actions/users";
import { resolveLaporanOprPeriod } from "@/lib/laporan-opr-period";
import { requireAdmin } from "@/lib/rbac";
import LaporanOprClient from "./LaporanOprClient";

export const dynamic = "force-dynamic";

type SP = { range?: string; month?: string; year?: string; sektor?: string; q?: string };

export default async function LaporanOprPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const period = resolveLaporanOprPeriod(sp);

  const sektorIds = (sp.sektor ?? "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
  const q = sp.q ?? "";

  const [sektors, rows] = await Promise.all([
    listAllSektors(),
    listSiapOprLaporan({
      start: period.start,
      end: period.end,
      sektorIds: sektorIds.length ? sektorIds : undefined,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <AdminNav />
      <div>
        <h1 className="text-xl font-semibold">Laporan OPR PPD</h1>
        <p className="text-sm text-slate-500">
          Ringkasan laporan pelaksanaan yang telah ditandakan siap. Klik pautan untuk pratonton atau
          cetak laporan penuh.
        </p>
      </div>
      <LaporanOprClient
        rows={rows.map((r) => ({
          ...r,
          tarikhPergi: r.tarikhPergi.toISOString(),
          tarikhKembali: r.tarikhKembali.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }))}
        sektors={sektors.map((s) => ({ id: s.id, code: s.code, name: s.name }))}
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
