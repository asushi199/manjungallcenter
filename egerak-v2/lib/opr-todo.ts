import type { OprStatus } from "@/lib/opr-status";

export type OprTodoFilter = "all" | "perlu" | "draf" | "siap" | "tiada";

export type OprTodoCategory = "cuti" | "perlu" | "draf" | "siap" | "tiada";

export function classifyOprTodo(
  jenis: "Pergerakan" | "Bercuti",
  oprStatus: OprStatus | null | undefined,
): OprTodoCategory {
  if (jenis === "Bercuti") return "cuti";
  if (oprStatus === "SIAP") return "siap";
  if (oprStatus === "TIADA") return "tiada";
  if (oprStatus === "DRAFT") return "draf";
  return "perlu";
}

export function matchesOprFilter(category: OprTodoCategory, filter: OprTodoFilter): boolean {
  if (filter === "all") return true;
  return category === filter;
}

export function countByOprCategory(
  items: Array<{ jenis: "Pergerakan" | "Bercuti"; oprStatus?: OprStatus | null }>,
): Record<OprTodoCategory, number> {
  const counts: Record<OprTodoCategory, number> = {
    cuti: 0,
    perlu: 0,
    draf: 0,
    siap: 0,
    tiada: 0,
  };
  for (const it of items) {
    counts[classifyOprTodo(it.jenis, it.oprStatus)] += 1;
  }
  return counts;
}

export function formatMonthOprSummary(
  counts: ReturnType<typeof countByOprCategory>,
): string {
  const parts: string[] = [];
  if (counts.perlu) parts.push(`${counts.perlu} perlu OPR`);
  if (counts.draf) parts.push(`${counts.draf} draf`);
  if (counts.siap) parts.push(`${counts.siap} siap`);
  if (counts.tiada) parts.push(`${counts.tiada} tiada`);
  if (counts.cuti) parts.push(`${counts.cuti} cuti`);
  return parts.length ? parts.join(" · ") : "Tiada rekod";
}
