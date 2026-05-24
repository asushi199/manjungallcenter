import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { TZ } from "@/lib/dates";

export type LaporanOprRange = "month" | "year" | "all";

export type LaporanOprPeriod = {
  range: LaporanOprRange;
  month: string;
  year: string;
  start?: Date;
  end?: Date;
  label: string;
};

export function resolveLaporanOprPeriod(sp: {
  range?: string;
  month?: string;
  year?: string;
}): LaporanOprPeriod {
  const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
  const defaultMonth = today.slice(0, 7);
  const defaultYear = today.slice(0, 4);

  const range: LaporanOprRange =
    sp.range === "year" || sp.range === "all" ? sp.range : "month";
  const month =
    sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : defaultMonth;
  const year = sp.year && /^\d{4}$/.test(sp.year) ? sp.year : defaultYear;

  if (range === "all") {
    return {
      range,
      month,
      year,
      label: "Semua tempoh",
    };
  }

  if (range === "year") {
    return {
      range,
      month,
      year,
      start: fromZonedTime(`${year}-01-01T00:00:00`, TZ),
      end: fromZonedTime(`${year}-12-31T23:59:59`, TZ),
      label: `Tahun ${year}`,
    };
  }

  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    range,
    month,
    year: String(y),
    start: fromZonedTime(`${month}-01T00:00:00`, TZ),
    end: fromZonedTime(
      `${month}-${String(lastDay).padStart(2, "0")}T23:59:59`,
      TZ,
    ),
    label: formatInTimeZone(fromZonedTime(`${month}-01T12:00:00`, TZ), TZ, "MMMM yyyy"),
  };
}
