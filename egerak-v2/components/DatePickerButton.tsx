"use client";

import type { ReactNode } from "react";
import { useId, useRef } from "react";
import CalendarIcon from "@/components/CalendarIcon";
import { cn } from "@/lib/cn";

export default function DatePickerButton({
  value,
  onChange,
  label,
  disabled,
  className,
  ariaLabel,
  type = "date",
}: {
  value: string;
  onChange: (value: string) => void;
  label: ReactNode;
  disabled?: boolean;
  className?: string;
  ariaLabel: string;
  /** Native picker granularity — "date" (lalai) atau "month". */
  type?: "date" | "month";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();

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
    <div className={cn("relative inline-flex w-full sm:w-auto", className)}>
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "btn-secondary w-full sm:w-auto justify-center gap-1.5 py-2.5 sm:py-2 px-3 text-sm font-semibold tabular-nums",
          "shadow-sm hover:shadow",
          "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1",
        )}
        onClick={openPicker}
        aria-label={ariaLabel}
      >
        <CalendarIcon className="size-4 shrink-0 text-brand-600" />
        <span id={labelId} className="truncate">
          {label}
        </span>
      </button>
      <input
        ref={inputRef}
        type={type}
        className="sr-only"
        value={value}
        disabled={disabled}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        aria-label={ariaLabel}
        tabIndex={-1}
      />
    </div>
  );
}
