export const SLOT_LABEL: Record<"AM" | "PM", string> = {
  AM: "Pagi (8:00 pagi – 12:59 tengah hari)",
  PM: "Petang (1:00 petang – 5:00 petang)",
};

export function slotTimeRange(slot: "AM" | "PM"): { start: string; end: string } {
  if (slot === "AM") return { start: "08:00", end: "12:59" };
  return { start: "13:00", end: "17:00" };
}

export function formatTarikhBm(tarikh: string): string {
  const [y, m, d] = tarikh.split("-");
  return `${d}-${m}-${y}`;
}
