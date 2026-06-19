import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/dates";
import { normalizeLokasi, urusanMatches } from "./normalize-text";

export type PergerakanRowForAnalisis = {
  id: number;
  urusan: string;
  lokasi: string;
  tarikhPergi: Date;
  sektorId: number | null;
  sektorCode: string | null;
  sektorName: string | null;

  /** OPR status untuk pergerakan ini (jika wujud). */
  oprStatus: "TIADA" | "DRAFT" | "SIAP" | null;
  /** Sektor atribusi OPR: sektor override (jika ada) atau sektor pergerakan. */
  oprSektorId: number | null;
  oprSektorCode: string | null;
  oprSektorName: string | null;
};

export type ClusteredProgram = {
  /** ID rekod pergerakan pertama dalam kluster (penganjur / wakil). */
  leadId: number;
  canonicalUrusan: string;
  lokasi: string;
  tarikhYmd: string;
  /** Bulan yyyy-MM untuk agregat (ikut tarikh pergi). */
  month: string;
  sektorId: number | null;
  sektorCode: string | null;
  sektorName: string | null;
  recordIds: number[];
  recordCount: number;

  /** Bilangan pergerakan dalam kluster yang ada OPR SIAP. */
  siapRecordCount: number;
  /**
   * Senarai sektor yang "mengira" program ini (sekurang-kurangnya 1 OPR SIAP dalam kluster).
   * Dipakai untuk kira jumlah program per sektor.
   */
  qualifyingSectors: { sektorId: number | null; code: string; name: string }[];
};

function bucketKey(row: PergerakanRowForAnalisis): string {
  const ymd = formatInTimeZone(row.tarikhPergi, TZ, "yyyy-MM-dd");
  const loc = normalizeLokasi(row.lokasi);
  return `${ymd}|${loc}`;
}

/**
 * Gabung rekod → satu program hanya jika:
 * - hari sama (tarikh pergi, yyyy-MM-dd),
 * - lokasi sama (teks lokasi dinormalisasi, bukan fuzzy),
 * - urusan hampir sama (urusanMatches).
 * Urusan sama + lokasi berbeza pada hari sama = program berasingan.
 */
export function clusterPrograms(rows: PergerakanRowForAnalisis[]): ClusteredProgram[] {
  const buckets = new Map<string, PergerakanRowForAnalisis[]>();
  for (const row of rows) {
    const key = bucketKey(row);
    const list = buckets.get(key) ?? [];
    list.push(row);
    buckets.set(key, list);
  }

  const programs: ClusteredProgram[] = [];

  for (const bucketRows of buckets.values()) {
    const sorted = [...bucketRows].sort(
      (a, b) => a.tarikhPergi.getTime() - b.tarikhPergi.getTime() || a.id - b.id,
    );

    const groups: PergerakanRowForAnalisis[][] = [];

    for (const row of sorted) {
      let placed = false;
      for (const group of groups) {
        const rep = group[0];
        if (urusanMatches(row.urusan, rep.urusan)) {
          group.push(row);
          placed = true;
          break;
        }
      }
      if (!placed) groups.push([row]);
    }

    for (const group of groups) {
      const lead = group[0];
      const canonicalUrusan = group.reduce(
        (best, r) => (r.urusan.length > best.length ? r.urusan : best),
        lead.urusan,
      );
      const tarikhYmd = formatInTimeZone(lead.tarikhPergi, TZ, "yyyy-MM-dd");
      const siapRows = group.filter((r) => r.oprStatus === "SIAP");
      const siapRecordCount = siapRows.length;

      const sektorMap = new Map<string, { sektorId: number | null; code: string; name: string }>();
      for (const r of siapRows) {
        const sektorId = r.oprSektorId ?? null;
        const key = sektorId != null ? String(sektorId) : "__none__";
        if (sektorMap.has(key)) continue;
        sektorMap.set(key, {
          sektorId,
          code: r.oprSektorCode ?? "—",
          name: r.oprSektorName ?? "Tidak ditetapkan",
        });
      }
      const qualifyingSectors = [...sektorMap.values()];

      programs.push({
        leadId: lead.id,
        canonicalUrusan,
        lokasi: lead.lokasi,
        tarikhYmd,
        month: tarikhYmd.slice(0, 7),
        sektorId: lead.sektorId,
        sektorCode: lead.sektorCode,
        sektorName: lead.sektorName,
        recordIds: group.map((r) => r.id),
        recordCount: group.length,
        siapRecordCount,
        qualifyingSectors,
      });
    }
  }

  return programs;
}

export type AnalisisAggregates = {
  totalPrograms: number;
  totalRecords: number;
  byMonth: { month: string; label: string; count: number }[];
  bySektor: { sektorId: number | null; code: string; name: string; count: number }[];
};

/** Agregat OPR siap mengikut Fokus (klasifikasi pelaksanaan program). */
export type FokusAggregates = {
  /** Jumlah OPR siap dalam tempoh (termasuk yang tiada fokus). */
  total: number;
  byFokus: { fokus: string; count: number }[];
  /** Trend bulanan (Jan–Dis): kiraan setiap fokus bagi setiap bulan. */
  byMonth: { month: string; label: string; counts: Record<string, number> }[];
  /** Nama fokus yang muncul dalam trend, disusun terbanyak dahulu (siri carta). */
  fokusKeys: string[];
  /** Silang Fokus × Sektor: bagi setiap sektor, kiraan mengikut fokus. */
  bySektorFokus: {
    sektorId: number | null;
    code: string;
    name: string;
    total: number;
    counts: Record<string, number>;
  }[];
};

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

export function aggregatePrograms(
  programs: ClusteredProgram[],
  opts: { year: string; filterMonth?: string; allPeriod?: boolean },
): AnalisisAggregates {
  let filtered = programs;
  if (opts.filterMonth) {
    filtered = programs.filter((p) => p.month === opts.filterMonth);
  } else if (!opts.allPeriod) {
    filtered = programs.filter((p) => p.month.startsWith(opts.year));
  }

  const qualifying = filtered.filter((p) => p.siapRecordCount > 0);
  const totalPrograms = qualifying.length;
  const totalRecords = qualifying.reduce((s, p) => s + p.siapRecordCount, 0);

  const monthCounts = new Map<number, number>();
  /** Carta garisan: tahun penuh (bukan ditapis bulan — bulan hanya untuk KPI/bar). */
  const chartSource = opts.allPeriod
    ? programs
    : programs.filter((p) => p.month.startsWith(opts.year));

  const chartQualifying = chartSource.filter((p) => p.siapRecordCount > 0);
  for (const p of chartQualifying) {
    const m = Number(p.month.slice(5, 7));
    if (m >= 1 && m <= 12) {
      monthCounts.set(m, (monthCounts.get(m) ?? 0) + 1);
    }
  }

  const byMonth: AnalisisAggregates["byMonth"] = [];
  for (let m = 1; m <= 12; m++) {
    const key = `${opts.year}-${String(m).padStart(2, "0")}`;
    byMonth.push({
      month: key,
      label: MONTH_LABELS_MS[m - 1],
      count: monthCounts.get(m) ?? 0,
    });
  }

  const sektorMap = new Map<
    string,
    { sektorId: number | null; code: string; name: string; count: number }
  >();

  for (const p of qualifying) {
    for (const s of p.qualifyingSectors) {
      const key = s.sektorId != null ? String(s.sektorId) : "__none__";
      const hit = sektorMap.get(key);
      if (hit) hit.count += 1;
      else sektorMap.set(key, { sektorId: s.sektorId, code: s.code, name: s.name, count: 1 });
    }
  }

  const bySektor = [...sektorMap.values()].sort((a, b) => b.count - a.count);

  return { totalPrograms, totalRecords, byMonth, bySektor };
}
