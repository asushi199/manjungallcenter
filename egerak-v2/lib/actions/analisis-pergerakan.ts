"use server";

import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { withDbTimeout } from "@/lib/db-timeout";
import {
  aggregatePrograms,
  clusterPrograms,
  type AnalisisAggregates,
} from "@/lib/analisis/cluster-programs";
import { resolveLaporanOprPeriod, type LaporanOprPeriod } from "@/lib/laporan-opr-period";
import { requireAnalisisAccess } from "@/lib/rbac";
import { pergerakan, sektors, users } from "@/lib/schema";

export type AnalisisPergerakanResult = {
  period: LaporanOprPeriod;
  aggregates: AnalisisAggregates;
  /** Untuk paparan semua bulan dalam carta (tahun penuh). */
  chartYear: string;
  filterMonth?: string;
};

export async function getAnalisisPergerakanData(sp: {
  range?: string;
  month?: string;
  year?: string;
  sektor?: string;
}): Promise<AnalisisPergerakanResult> {
  await requireAnalisisAccess();

  const period = resolveLaporanOprPeriod(sp);
  const chartYear = period.range === "month" ? period.month.slice(0, 4) : period.year;
  const filterMonth = period.range === "month" ? period.month : undefined;

  const sektorIds = (sp.sektor ?? "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);

  const conditions = [eq(pergerakan.aktif, true), eq(pergerakan.jenis, "Pergerakan")];

  if (period.start && period.end) {
    conditions.push(lte(pergerakan.tarikhPergi, period.end));
    conditions.push(gte(pergerakan.tarikhKembali, period.start));
  }

  if (sektorIds.length) {
    conditions.push(inArray(pergerakan.sektorId, sektorIds));
  }

  const rows = await withDbTimeout(
    db
      .select({
        id: pergerakan.id,
        urusan: pergerakan.urusan,
        lokasi: pergerakan.lokasi,
        tarikhPergi: pergerakan.tarikhPergi,
        sektorId: pergerakan.sektorId,
        sektorCode: sektors.code,
        sektorName: sektors.name,
      })
      .from(pergerakan)
      .innerJoin(users, eq(users.id, pergerakan.userId))
      .leftJoin(sektors, eq(sektors.id, pergerakan.sektorId))
      .where(and(...conditions)),
  );

  const mapped = rows.map((r) => ({
    id: r.id,
    urusan: r.urusan,
    lokasi: r.lokasi,
    tarikhPergi: new Date(r.tarikhPergi),
    sektorId: r.sektorId,
    sektorCode: r.sektorCode,
    sektorName: r.sektorName,
  }));

  const programs = clusterPrograms(mapped);
  const aggregates = aggregatePrograms(programs, {
    year: chartYear,
    filterMonth,
    allPeriod: period.range === "all",
  });

  return {
    period,
    aggregates,
    chartYear,
    filterMonth,
  };
}
