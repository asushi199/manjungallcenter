import { computeRoomSlotsForRange } from "@/lib/sync-room-bookings";

/** Slot (AM/PM) yang diduduki pergerakan pada satu tarikh. */
export function slotsOnDay(pergi: Date, kembali: Date, ymd: string): ("AM" | "PM")[] {
  return computeRoomSlotsForRange(pergi, kembali)
    .filter((s) => s.tarikh === ymd)
    .map((s) => s.slot);
}

/** Ringkasan kehadiran pada satu tarikh untuk serlahkan slot cadangan. */
export function attendanceKind(
  pergi: Date,
  kembali: Date,
  ymd: string,
): "AM" | "PM" | "FULL" | "NONE" {
  const slots = slotsOnDay(pergi, kembali, ymd);
  const am = slots.includes("AM");
  const pm = slots.includes("PM");
  if (am && pm) return "FULL";
  if (am) return "AM";
  if (pm) return "PM";
  return "NONE";
}
