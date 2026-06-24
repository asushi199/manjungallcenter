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
            <p className="text-xs text-slate-500 leading-snug break-words">{user.jawatan}</p>
            <p className="text-xs text-slate-500">ID: {user.username}</p>
          </div>

          <Suspense fallback={<TodayStatsSkeleton />}>
            <DashboardTodayStats />
          </Suspense>

          <Link
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-brand-700 via-brand-600 to-cyan-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:from-brand-800 hover:via-brand-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            href="/new"
          >
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/20 text-base font-semibold leading-none ring-1 ring-white/25"
              aria-hidden="true"
            >
              +
            </span>
            <span>Isi Pergerakan Baharu</span>
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
