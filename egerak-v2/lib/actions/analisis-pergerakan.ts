"use server";

import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { withDbTimeout } from "@/lib/db-timeout";
import type { AnalisisAggregates } from "@/lib/analisis/cluster-programs";
import { resolveLaporanOprPeriod, type LaporanOprPeriod } from "@/lib/laporan-opr-period";
import { requireAnalisisAccess } from "@/lib/rbac";
import { applySektorScopeToFilter, resolveUserSektorScope } from "@/lib/sektor-admin-scope";
import { opr, pergerakan, sektors, users } from "@/lib/schema";
import { TZ } from "@/lib/dates";

export type AnalisisPergerakanResult = {
  period: LaporanOprPeriod;
  pergerakanAggregates: AnalisisAggregates;
  programAggregates: AnalisisAggregates;
  chartYear: string;
  filterMonth?: string;
};

const sektorPg = alias(sektors, "sektor_pg");
const sektorOv = alias(sektors, "sektor_ov");

const MONTH_LABELS_MS = [
  "Jan",
  "Feb",
  "Mac",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Ogos",
  "Sep",
  "Okt",
  "Nov",
  "Dis",
];

type AggRow = {
  tarikhPergi: Date;
  sektorId: number | null;
  sektorCode: string | null;
  sektorName: string | null;
};

function aggregateAnalisis(
  rows: AggRow[],
  opts: { year: string; filterMonth?: string; allPeriod?: boolean },
): AnalisisAggregates {
  let filtered = rows;
  if (opts.filterMonth) {
    filtered = rows.filter(
      (r) => formatInTimeZone(r.tarikhPergi, TZ, "yyyy-MM") === opts.filterMonth,
    );
  } else if (!opts.allPeriod) {
    filtered = rows.filter((r) => formatInTimeZone(r.tarikhPergi, TZ, "yyyy") === opts.year);
  }

  const totalPrograms = filtered.length;
  const totalRecords = filtered.length;

  const monthCounts = new Map<number, number>();
  const chartSource = opts.allPeriod
    ? rows
    : rows.filter((r) => formatInTimeZone(r.tarikhPergi, TZ, "yyyy") === opts.year);

  for (const r of chartSource) {
    const month = Number(formatInTimeZone(r.tarikhPergi, TZ, "MM"));
    if (month >= 1 && month <= 12) {
      monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
    }
  }

  const byMonth: AnalisisAggregates["byMonth"] = [];
  for (let m = 1; m <= 12; m++) {
    byMonth.push({
      month: `${opts.year}-${String(m).padStart(2, "0")}`,
      label: MONTH_LABELS_MS[m - 1],
      count: monthCounts.get(m) ?? 0,
    });
  }

  const sektorMap = new Map<
    string,
    { sektorId: number | null; code: string; name: string; count: number }
  >();
  for (const r of filtered) {
    const key = r.sektorId != null ? String(r.sektorId) : "__none__";
    const hit = sektorMap.get(key);
    if (hit) hit.count += 1;
    else
      sektorMap.set(key, {
        sektorId: r.sektorId,
        code: r.sektorCode ?? "—",
        name: r.sektorName ?? "Tidak ditetapkan",
        count: 1,
      });
  }

  const bySektor = [...sektorMap.values()].sort((a, b) => b.count - a.count);
  return { totalPrograms, totalRecords, byMonth, bySektor };
}

function emptyAggregates(opts: {
  year: string;
  filterMonth?: string;
  allPeriod?: boolean;
}): AnalisisAggregates {
  return aggregateAnalisis([], opts);
}

function filterByOprSektorScope(
  rows: AggRow[],
  effectiveSektorIds: number[] | undefined,
): AggRow[] {
  if (!effectiveSektorIds?.length) return rows;
  return rows.filter((r) => r.sektorId != null && effectiveSektorIds.includes(r.sektorId));
}

export async function getAnalisisPergerakanData(sp: {
  range?: string;
  month?: string;
  year?: string;
  sektor?: string;
}): Promise<AnalisisPergerakanResult> {
  const user = await requireAnalisisAccess();
  const scope = await resolveUserSektorScope(user);

  const period = resolveLaporanOprPeriod(sp);
  const chartYear = period.range === "month" ? period.month.slice(0, 4) : period.year;
  const filterMonth = period.range === "month" ? period.month : undefined;
  const aggOpts = {
    year: chartYear,
    filterMonth,
    allPeriod: period.range === "all",
  };

  const requestedSektorIds = (sp.sektor ?? "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);

  const effectiveSektorIds = applySektorScopeToFilter(
    requestedSektorIds.length ? requestedSektorIds : undefined,
    scope,
  );

  if (scope.noAccess || effectiveSektorIds?.length === 0) {
    return {
      period,
      pergerakanAggregates: emptyAggregates(aggOpts),
      programAggregates: emptyAggregates(aggOpts),
      chartYear,
      filterMonth,
    };
  }

  const dateConditions = [];
  if (period.start && period.end) {
    dateConditions.push(lte(pergerakan.tarikhPergi, period.end));
    dateConditions.push(gte(pergerakan.tarikhKembali, period.start));
  }

  const pergerakanConditions = [
    eq(pergerakan.aktif, true),
    eq(pergerakan.jenis, "Pergerakan"),
    ...dateConditions,
  ];
  if (effectiveSektorIds?.length) {
    pergerakanConditions.push(inArray(pergerakan.sektorId, effectiveSektorIds));
  }

  const pergerakanRows = await withDbTimeout(
    db
      .select({
        tarikhPergi: pergerakan.tarikhPergi,
        sektorId: pergerakan.sektorId,
        sektorCode: sektorPg.code,
        sektorName: sektorPg.name,
      })
      .from(pergerakan)
      .innerJoin(users, eq(users.id, pergerakan.userId))
      .leftJoin(sektorPg, eq(sektorPg.id, pergerakan.sektorId))
      .where(and(...pergerakanConditions)),
  );

  const pergerakanAggregates = aggregateAnalisis(
    pergerakanRows.map((r) => ({
      tarikhPergi: new Date(r.tarikhPergi),
      sektorId: r.sektorId,
      sektorCode: r.sektorCode,
      sektorName: r.sektorName,
    })),
    aggOpts,
  );

  const programConditions = [
    eq(pergerakan.aktif, true),
    eq(pergerakan.jenis, "Pergerakan"),
    eq(opr.status, "SIAP"),
    ...dateConditions,
  ];

  const oprSiapRows = await withDbTimeout(
    db
      .select({
        tarikhPergi: pergerakan.tarikhPergi,
        sektorId: pergerakan.sektorId,
        sektorCode: sektorPg.code,
        sektorName: sektorPg.name,
        oprSektorOverrideId: opr.sektorOverrideId,
        oprSektorCode: sektorOv.code,
        oprSektorName: sektorOv.name,
      })
      .from(opr)
      .innerJoin(pergerakan, eq(opr.pergerakanId, pergerakan.id))
      .innerJoin(users, eq(users.id, pergerakan.userId))
      .leftJoin(sektorPg, eq(sektorPg.id, pergerakan.sektorId))
      .leftJoin(sektorOv, eq(sektorOv.id, opr.sektorOverrideId))
      .where(and(...programConditions)),
  );

  const programRows = filterByOprSektorScope(
    oprSiapRows.map((r) => {
      const useOverride = r.oprSektorOverrideId != null;
      return {
        tarikhPergi: new Date(r.tarikhPergi),
        sektorId: useOverride ? r.oprSektorOverrideId : r.sektorId,
        sektorCode: useOverride ? r.oprSektorCode : r.sektorCode,
        sektorName: useOverride ? r.oprSektorName : r.sektorName,
      };
    }),
    effectiveSektorIds,
  );

  const programAggregates = aggregateAnalisis(programRows, aggOpts);

  return {
    period,
    pergerakanAggregates,
    programAggregates,
    chartYear,
    filterMonth,
  };
}
