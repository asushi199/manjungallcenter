import { Suspense } from "react";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { TZ } from "@/lib/dates";
import { requireUser } from "@/lib/rbac";
import DashboardTodayStats from "./DashboardTodayStats";
import DashboardMain from "./DashboardMain";
import { TodayStatsSkeleton, MainSectionSkeleton } from "./DashboardSkeletons";

export const dynamic = "force-dynamic";

type SP = { date?: string; month?: string; sektor?: string; cuti?: string; sekolah?: string };

function parseDateParam(sp: string | undefined): string {
  const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
  if (!sp || !/^\d{4}-\d{2}-\d{2}$/.test(sp)) return today;
  return sp;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const date = parseDateParam(sp.date);
  const month =
    sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : date.slice(0, 7);
  const sektorIds = (sp.sektor ?? "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
  const includeCuti = sp.cuti === "1";
  /** Lalai: papar cuti sekolah; set sekolah=0 untuk sembunyi */
  const showSchoolHolidays = sp.sekolah !== "0";

  const mainKey = `${month}|${sektorIds.join(",")}|${includeCuti ? "1" : "0"}|${showSchoolHolidays ? "1" : "0"}`;

  return (
    <div className="mx-auto max-w-7xl p-4 grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-brand-700 mb-1">Selamat Datang</h2>
            <p className="font-medium">{user.nama}</p>
            <p className="text-xs text-slate-500">{user.jawatan}</p>
            <p className="text-xs text-slate-500">ID: {user.username}</p>
          </div>

          <Suspense fallback={<TodayStatsSkeleton />}>
            <DashboardTodayStats />
          </Suspense>

          <Link className="btn-primary w-full justify-center" href="/new">
            + Isi Pergerakan Baharu
          </Link>
        </aside>

        <Suspense key={mainKey} fallback={<MainSectionSkeleton />}>
          <DashboardMain
            date={date}
            month={month}
            sektorIds={sektorIds}
            includeCuti={includeCuti}
            showSchoolHolidays={showSchoolHolidays}
          />
        </Suspense>
    </div>
  );
}
