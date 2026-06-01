/** Langkah masa untuk borang daftar pergerakan (30 min). */
export const REGISTER_TIME_STEP_MINUTES = 30;

const REGISTER_DAY_START_MIN = 7 * 60; // 07:00
const REGISTER_DAY_END_MIN = 23 * 60 + 30; // 23:30

function buildTimeOptions(stepMinutes: number, startMin: number, endMin: number): string[] {
  const out: string[] = [];
  for (let t = startMin; t <= endMin; t += stepMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return out;
}

/** Pilihan masa daftar pergerakan — 30 min: 07:00, 07:30 … 23:00, 23:30 */
export const TIME_OPTIONS_REGISTER: string[] = buildTimeOptions(
  REGISTER_TIME_STEP_MINUTES,
  REGISTER_DAY_START_MIN,
  REGISTER_DAY_END_MIN,
);

/** @deprecated Guna TIME_OPTIONS_REGISTER */
export const TIME_OPTIONS_5MIN: string[] = TIME_OPTIONS_REGISTER;

export const DEFAULT_TIME_PERGI = "08:00";
export const DEFAULT_TIME_KEMBALI = "17:00";

export function snapTimeToRegisterStep(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return DEFAULT_TIME_PERGI;
  let total = Number(match[1]) * 60 + Number(match[2]);
  const step = REGISTER_TIME_STEP_MINUTES;
  total = Math.round(total / step) * step;
  if (total < REGISTER_DAY_START_MIN) total = REGISTER_DAY_START_MIN;
  if (total > REGISTER_DAY_END_MIN) total = REGISTER_DAY_END_MIN;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** @deprecated */
export const snapTimeToFiveMin = snapTimeToRegisterStep;

export function combineDateAndTime(date: string, time: string): string {
  if (!date || !time) return "";
  return `${date}T${snapTimeToRegisterStep(time)}`;
}

export function splitDateTime(value: string): { date: string; time: string } {
  if (!value || !value.includes("T")) {
    return { date: "", time: DEFAULT_TIME_PERGI };
  }
  const [date, timePart] = value.split("T");
  const time = timePart?.slice(0, 5) ?? DEFAULT_TIME_PERGI;
  return { date, time: snapTimeToRegisterStep(time) };
}

export function timeToMinutes(time: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return REGISTER_DAY_START_MIN;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function minutesToTime(totalMinutes: number): string {
  let total = totalMinutes;
  if (total < REGISTER_DAY_START_MIN) total = REGISTER_DAY_START_MIN;
  if (total > REGISTER_DAY_END_MIN) total = REGISTER_DAY_END_MIN;
  total = Math.round(total / REGISTER_TIME_STEP_MINUTES) * REGISTER_TIME_STEP_MINUTES;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Banding tarikh+masa tempatan `yyyy-MM-ddTHH:mm`. */
export function compareDateTimes(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  const pa = splitDateTime(a);
  const pb = splitDateTime(b);
  if (pa.date !== pb.date) return pa.date < pb.date ? -1 : 1;
  return timeToMinutes(pa.time) - timeToMinutes(pb.time);
}

function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function addMinutesToDateTime(value: string, addMinutes: number): string {
  const { date, time } = splitDateTime(value);
  if (!date) return "";
  const total = timeToMinutes(time) + addMinutes;
  if (total <= REGISTER_DAY_END_MIN) {
    return combineDateAndTime(date, minutesToTime(total));
  }
  const nextDate = addDaysToYmd(date, 1);
  const nextDayMin = total - 24 * 60;
  if (nextDayMin < REGISTER_DAY_START_MIN) {
    return combineDateAndTime(nextDate, minutesToTime(REGISTER_DAY_START_MIN));
  }
  return combineDateAndTime(nextDate, minutesToTime(nextDayMin));
}

/** Pilihan masa kembali: hari sama → tidak sebelum masa pergi; hari lain → penuh. */
export function getReturnTimeOptions(departValue: string, returnDate: string): string[] {
  if (!departValue || !returnDate) return TIME_OPTIONS_REGISTER;
  const depart = splitDateTime(departValue);
  if (!depart.date) return TIME_OPTIONS_REGISTER;
  if (returnDate > depart.date) return TIME_OPTIONS_REGISTER;
  if (returnDate < depart.date) return TIME_OPTIONS_REGISTER;
  const minMin = timeToMinutes(depart.time);
  return TIME_OPTIONS_REGISTER.filter((t) => timeToMinutes(t) >= minMin);
}

/** Pastikan kembali ≥ pergi; jika kosong atau terlalu awal → pergi + 30 min. */
export function ensureReturnAfterDeparture(depart: string, ret: string): string {
  if (!depart) return ret;
  if (!ret) {
    return addMinutesToDateTime(depart, REGISTER_TIME_STEP_MINUTES);
  }
  if (compareDateTimes(ret, depart) <= 0) {
    return addMinutesToDateTime(depart, REGISTER_TIME_STEP_MINUTES);
  }
  const retParts = splitDateTime(ret);
  const departParts = splitDateTime(depart);
  if (retParts.date < departParts.date) {
    return combineDateAndTime(departParts.date, retParts.time);
  }
  if (retParts.date === departParts.date && timeToMinutes(retParts.time) < timeToMinutes(departParts.time)) {
    return addMinutesToDateTime(depart, REGISTER_TIME_STEP_MINUTES);
  }
  return ret;
}

/**
 * Apabila tarikh pergi berubah → kembali = hari sama + 30 min (lalai).
 * Hanya masa pergi berubah (hari sama) → kekalkan tarikh kembali jika masih sah.
 */
export function syncReturnWhenDepartChanges(
  prevDepart: string,
  nextDepart: string,
  currentReturn: string,
): string {
  if (!nextDepart) return currentReturn;
  const prevDate = splitDateTime(prevDepart).date;
  const nextDate = splitDateTime(nextDepart).date;
  if (!prevDate || prevDate !== nextDate) {
    return addMinutesToDateTime(nextDepart, REGISTER_TIME_STEP_MINUTES);
  }
  return ensureReturnAfterDeparture(nextDepart, currentReturn);
}
