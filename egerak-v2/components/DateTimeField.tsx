"use client";

import { useEffect, useMemo } from "react";
import {
  TIME_OPTIONS_REGISTER,
  combineDateAndTime,
  splitDateTime,
} from "@/lib/datetime-picker";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  defaultTime?: string;
  required?: boolean;
  /** Tarikh minimum (yyyy-MM-dd), contoh: tidak sebelum tarikh pergi */
  minDate?: string;
  /** Senarai masa; lalai = TIME_OPTIONS_REGISTER */
  timeOptions?: string[];
};

export default function DateTimeField({
  id,
  label,
  value,
  onChange,
  defaultTime = "08:00",
  required,
  minDate,
  timeOptions: timeOptionsProp,
}: Props) {
  const { date, time } = splitDateTime(value);
  const timeOptions = timeOptionsProp ?? TIME_OPTIONS_REGISTER;
  const timeValue = date ? time : defaultTime;

  const effectiveTime = useMemo(() => {
    if (timeOptions.includes(timeValue)) return timeValue;
    return timeOptions[0] ?? defaultTime;
  }, [timeOptions, timeValue, defaultTime]);

  useEffect(() => {
    if (!date || !timeOptions.length) return;
    if (timeValue !== effectiveTime) {
      onChange(combineDateAndTime(date, effectiveTime));
    }
  }, [date, effectiveTime, timeOptions.length, timeValue, onChange]);

  function setDate(nextDate: string) {
    if (!nextDate) {
      onChange("");
      return;
    }
    if (minDate && nextDate < minDate) {
      nextDate = minDate;
    }
    const t = timeOptions.includes(timeValue) ? timeValue : (timeOptions[0] ?? defaultTime);
    onChange(combineDateAndTime(nextDate, t));
  }

  function setTime(nextTime: string) {
    if (!date) return;
    onChange(combineDateAndTime(date, nextTime));
  }

  return (
    <div>
      <label className="label" htmlFor={`${id}-date`}>
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={`${id}-date`}
          type="date"
          className="input flex-1 min-w-0"
          required={required}
          value={date}
          min={minDate}
          onChange={(e) => setDate(e.target.value)}
        />
        <select
          id={`${id}-time`}
          className="input w-[6.25rem] shrink-0 tabular-nums"
          required={required && Boolean(date)}
          disabled={!date}
          value={date ? effectiveTime : defaultTime}
          onChange={(e) => setTime(e.target.value)}
          aria-label={`Masa ${label}`}
        >
          {timeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
