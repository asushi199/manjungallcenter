"use client";

import { useId, useRef } from "react";
import { format } from "date-fns";
import { ms } from "date-fns/locale/ms";
import { cn } from "@/lib/cn";

function monthTitle(value: string): string {
  const [y, m] = value.split("-").map(Number);
  if (!y || !m) return value;
  return format(new Date(y, m - 1, 1), "MMMM yyyy", { locale: ms });
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <rect x="2.5" y="4.5" width="15" height="13" rx="2" />
      <path d="M2.5 8.5h15" strokeLinecap="round" />
      <path d="M6.5 3v3M13.5 3v3" strokeLinecap="round" />
    </svg>
  );
}

export default function MonthPickerButton({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const title = monthTitle(value);

  function openPicker() {
    const input = inputRef.current;
    if (!input || disabled) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.click();
  }

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "btn-secondary gap-1.5 py-1.5 pl-2 pr-2.5 text-sm font-semibold",
          "min-w-[9.25rem] sm:min-w-[10.25rem]",
          "shadow-sm hover:shadow",
          "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1",
        )}
        onClick={openPicker}
        aria-labelledby={labelId}
      >
        <CalendarIcon className="size-4 shrink-0 text-brand-600" />
        <span id={labelId} className="truncate capitalize">
          {title}
        </span>
      </button>
      <input
        ref={inputRef}
        type="month"
        className="sr-only"
        value={value}
        disabled={disabled}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        aria-label={`Pilih bulan — ${title}`}
        tabIndex={-1}
      />
    </div>
  );
}
