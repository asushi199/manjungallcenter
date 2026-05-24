"use client";

import {
  TIME_OPTIONS_5MIN,
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
};

export default function DateTimeField({
  id,
  label,
  value,
  onChange,
  defaultTime = "08:00",
  required,
}: Props) {
  const { date, time } = splitDateTime(value);
  const timeValue = date ? time : defaultTime;

  function setDate(nextDate: string) {
    if (!nextDate) {
      onChange("");
      return;
    }
    onChange(combineDateAndTime(nextDate, timeValue || defaultTime));
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
          onChange={(e) => setDate(e.target.value)}
        />
        <select
          id={`${id}-time`}
          className="input w-[6.25rem] shrink-0 tabular-nums"
          required={required && Boolean(date)}
          disabled={!date}
          value={date ? timeValue : defaultTime}
          onChange={(e) => setTime(e.target.value)}
          aria-label={`Masa ${label}`}
        >
          {TIME_OPTIONS_5MIN.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
