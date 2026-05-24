/** Pilihan masa setiap 5 minit (06:00 – 23:55). */
export const TIME_OPTIONS_5MIN: string[] = (() => {
  const out: string[] = [];
  for (let h = 6; h <= 23; h++) {
    for (let m = 0; m < 60; m += 5) {
      if (h === 23 && m > 55) break;
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

export const DEFAULT_TIME_PERGI = "08:00";
export const DEFAULT_TIME_KEMBALI = "17:00";

export function snapTimeToFiveMin(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return DEFAULT_TIME_PERGI;
  let total = Number(match[1]) * 60 + Number(match[2]);
  total = Math.round(total / 5) * 5;
  if (total < 6 * 60) total = 6 * 60;
  if (total > 23 * 60 + 55) total = 23 * 60 + 55;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function combineDateAndTime(date: string, time: string): string {
  if (!date || !time) return "";
  return `${date}T${snapTimeToFiveMin(time)}`;
}

export function splitDateTime(value: string): { date: string; time: string } {
  if (!value || !value.includes("T")) {
    return { date: "", time: DEFAULT_TIME_PERGI };
  }
  const [date, timePart] = value.split("T");
  const time = timePart?.slice(0, 5) ?? DEFAULT_TIME_PERGI;
  return { date, time: snapTimeToFiveMin(time) };
}
