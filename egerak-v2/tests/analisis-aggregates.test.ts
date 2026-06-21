import assert from "node:assert/strict";
import test from "node:test";
import { aggregatePrograms, type ClusteredProgram } from "../lib/analisis/cluster-programs";

function program(partial: Partial<ClusteredProgram>): ClusteredProgram {
  return {
    leadId: partial.leadId ?? 1,
    canonicalUrusan: partial.canonicalUrusan ?? "Program",
    lokasi: partial.lokasi ?? "PPD Manjung",
    tarikhYmd: partial.tarikhYmd ?? "2026-01-01",
    month: partial.month ?? "2026-01",
    sektorId: partial.sektorId ?? 1,
    sektorCode: partial.sektorCode ?? "USTP",
    sektorName: partial.sektorName ?? "USTP",
    recordIds: partial.recordIds ?? [partial.leadId ?? 1],
    recordCount: partial.recordCount ?? 1,
    siapRecordCount: partial.siapRecordCount ?? 1,
    qualifyingSectors: partial.qualifyingSectors ?? [
      { sektorId: 1, code: "USTP", name: "USTP" },
    ],
  };
}

test("aggregatePrograms includes monthly counts split by sector", () => {
  const aggregates = aggregatePrograms(
    [
      program({
        leadId: 1,
        month: "2026-01",
        qualifyingSectors: [{ sektorId: 1, code: "USTP", name: "USTP" }],
      }),
      program({
        leadId: 2,
        month: "2026-01",
        qualifyingSectors: [{ sektorId: 2, code: "SPb", name: "Sektor Pembelajaran" }],
      }),
      program({
        leadId: 3,
        month: "2026-02",
        qualifyingSectors: [{ sektorId: 1, code: "USTP", name: "USTP" }],
      }),
    ],
    { year: "2026" },
  );

  assert.deepEqual((aggregates as any).byMonthSektor.slice(0, 2), [
    {
      month: "2026-01",
      label: "Jan",
      counts: { USTP: 1, "Sektor Pembelajaran": 1 },
    },
    {
      month: "2026-02",
      label: "Feb",
      counts: { USTP: 1, "Sektor Pembelajaran": 0 },
    },
  ]);
  assert.deepEqual((aggregates as any).sektorKeys, ["USTP", "Sektor Pembelajaran"]);
});
