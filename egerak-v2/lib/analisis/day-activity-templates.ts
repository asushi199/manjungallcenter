import { urusanMatches } from "./normalize-text";

/** Cadangan borang /new: satu entri setiap urusan (hampir sama), lokasi ikut rekod pertama. */
export function buildDayUrusanCadangan(rows: DayActivityRow[]): DayActivityTemplate[] {
  const valid: DayActivityRow[] = [];
  for (const r of rows) {
    const urusan = String(r.urusan || "").trim();
    const lokasi = String(r.lokasi || "").trim();
    if (!urusan) continue;
    valid.push({
      urusan,
      lokasi,
      tarikhPergi: r.tarikhPergi,
      tarikhKembali: r.tarikhKembali,
    });
  }

  const sorted = [...valid].sort((a, b) => a.tarikhPergi.getTime() - b.tarikhPergi.getTime());

  const groups: DayActivityRow[][] = [];
  for (const row of sorted) {
    let placed = false;
    for (const group of groups) {
      if (urusanMatches(row.urusan, group[0].urusan)) {
        group.push(row);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([row]);
  }

  return groups
    .map((group) => {
      const lead = group[0];
      const bestUrusan = group.reduce(
        (best, r) => (r.urusan.length > best.length ? r.urusan : best),
        lead.urusan,
      );
      return {
        urusan: bestUrusan,
        lokasi: lead.lokasi,
        tarikhPergi: lead.tarikhPergi,
        tarikhKembali: lead.tarikhKembali,
        count: group.length,
      };
    })
    .sort((a, b) => b.count - a.count || b.urusan.length - a.urusan.length);
}

export type DayActivityRow = {
  urusan: string;
  lokasi: string;
  tarikhPergi: Date;
  tarikhKembali: Date;
};

export type DayActivityTemplate = {
  urusan: string;
  lokasi: string;
  tarikhPergi: Date;
  tarikhKembali: Date;
  count: number;
};
