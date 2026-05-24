"use client";

import { useEffect, useId, useRef, useState } from "react";
import { sektorStyle } from "@/lib/sektor-colors";
import { cn } from "@/lib/cn";
import type { SektorOption } from "@/components/FilterBar";

function formatSektorLabel(code: string) {
  return code.replace(/_/g, " ");
}

function triggerLabel(sektors: SektorOption[], selectedIds: number[]) {
  if (selectedIds.length === 0) return "Semua sektor";
  if (selectedIds.length === 1) {
    const s = sektors.find((x) => x.id === selectedIds[0]);
    return s ? formatSektorLabel(s.code) : "1 sektor";
  }
  return `${selectedIds.length} sektor dipilih`;
}

export default function SektorFilterDropdown({
  sektors,
  selectedIds,
  onChange,
  disabled,
  label = "Saring sektor",
}: {
  sektors: SektorOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  label?: string;
}) {
  const listId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(id: number) {
    const set = new Set(selectedIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange([...set]);
  }

  const summary = triggerLabel(sektors, selectedIds);

  return (
    <div ref={ref} className="relative">
      <label className="label" htmlFor={listId}>
        {label}
      </label>
      <button
        id={listId}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "input flex w-full items-center justify-between gap-2 text-left",
          disabled && "opacity-60 cursor-not-allowed",
        )}
      >
        <span className="truncate">{summary}</span>
        <span className="text-slate-400 shrink-0 text-xs" aria-hidden>
          ▾
        </span>
      </button>

      {selectedIds.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {selectedIds.map((id) => {
            const s = sektors.find((x) => x.id === id);
            if (!s) return null;
            const st = sektorStyle(s.code);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: st.bg,
                  borderColor: st.border,
                  color: st.text,
                }}
              >
                {formatSektorLabel(s.code)}
                <button
                  type="button"
                  className="opacity-70 hover:opacity-100 leading-none"
                  aria-label={`Buang ${s.name}`}
                  disabled={disabled}
                  onClick={() => toggle(id)}
                >
                  ×
                </button>
              </span>
            );
          })}
          <button
            type="button"
            className="text-[11px] text-slate-500 underline"
            disabled={disabled}
            onClick={() => onChange([])}
          >
            Kosongkan
          </button>
        </div>
      )}

      {open && (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute z-40 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="option"
            aria-selected={selectedIds.length === 0}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50",
              selectedIds.length === 0 && "bg-brand-50 font-medium text-brand-800",
            )}
            onClick={() => {
              onChange([]);
              setOpen(false);
            }}
          >
            <span className="w-3 h-3 rounded-full bg-brand-600 shrink-0" />
            Semua sektor
          </button>
          {sektors.map((s) => {
            const checked = selectedIds.includes(s.id);
            const st = sektorStyle(s.code);
            return (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={checked}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50",
                  checked && "bg-slate-50",
                )}
                onClick={() => toggle(s.id)}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0 border"
                  style={{
                    backgroundColor: checked ? st.chip : st.bg,
                    borderColor: st.border,
                  }}
                />
                <span className="min-w-0 font-medium flex-1" style={{ color: st.text }}>
                  {formatSektorLabel(s.code)}
                </span>
                {checked && (
                  <span className="ml-auto text-brand-600 text-xs shrink-0">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
