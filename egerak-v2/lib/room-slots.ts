export const SLOT_LABEL: Record<"AM" | "PM", string> = {
  AM: "Pagi (8:00 pagi – 1:00 petang)",
  PM: "Petang (1:01 petang – 5:00 petang)",
};

export function slotTimeRange(slot: "AM" | "PM"): { start: string; end: string } {
  if (slot === "AM") return { start: "08:00", end: "13:00" };
  return { start: "13:01", end: "17:00" };
}

export function formatTarikhBm(tarikh: string): string {
  const [y, m, d] = tarikh.split("-");
  return `${d}-${m}-${y}`;
}
