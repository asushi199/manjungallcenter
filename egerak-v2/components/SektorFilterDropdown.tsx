"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  compact = false,
  triggerVariant = "text",
}: {
  sektors: SektorOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  label?: string;
  /** Satu baris dengan navigasi bulan — label ringkas, tanpa chip di bawah */
  compact?: boolean;
  /** Tukar butang pemicu kepada icon (jimat ruang). */
  triggerVariant?: "text" | "icon";
}) {
  const listId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      const inside =
        (ref.current && ref.current.contains(target)) ||
        (triggerBtnRef.current && triggerBtnRef.current.contains(target)) ||
        (menuRef.current && menuRef.current.contains(target));
      if (!inside) setOpen(false);
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
  const selectedCount = selectedIds.length;
  const isIconTrigger = triggerVariant === "icon";

  useEffect(() => {
    if (!open || !isIconTrigger) return;
    function compute() {
      const btn = triggerBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuWidth = 224; // w-56 (approx)
      const margin = 8;
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - menuWidth - margin));
      const top = rect.bottom;
      setMenuPos({ top, left });
    }
    compute();
    // Keep it stable while user scrolls a bit on mobile.
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open, isIconTrigger]);

  return (
    <div ref={ref} className={cn("relative", compact && "min-w-0")}>
      <label className={cn("label", compact && "sr-only")} htmlFor={listId}>
        {label}
      </label>
      {triggerVariant === "icon" ? (
        <div className="relative inline-flex">
          <button
            id={listId}
            type="button"
            disabled={disabled}
            onClick={() => setOpen((v) => !v)}
            ref={triggerBtnRef}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={label}
            title={label}
            className={cn(
              "inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 py-2 text-slate-700 hover:bg-slate-50 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500",
              disabled && "opacity-60 cursor-not-allowed",
            )}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path
                d="M3 5h18l-7 8v5l-4 2v-7L3 5z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {selectedCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-brand-600 text-white text-[10px] font-bold leading-5 text-center shadow"
              aria-label={`${selectedCount} sektor dipilih`}
              title={`${selectedCount} sektor dipilih`}
            >
              {selectedCount}
            </span>
          )}
        </div>
      ) : (
        <button
          id={listId}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="listbox"
          title={label}
          className={cn(
            "input flex w-full items-center justify-between gap-2 text-left",
            compact && "py-1.5 text-xs min-h-0",
            disabled && "opacity-60 cursor-not-allowed",
          )}
        >
          <span className="truncate">{summary}</span>
          <span className="text-slate-400 shrink-0 text-xs" aria-hidden>
            ▾
          </span>
        </button>
      )}

      {selectedIds.length > 0 && !compact && (
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
        <>
          {isIconTrigger ? (
            createPortal(
              <div
                ref={menuRef}
                role="listbox"
                aria-multiselectable
                className="fixed z-50 max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg w-56"
                style={{
                  top: menuPos?.top ?? 0,
                  left: menuPos?.left ?? 0,
                }}
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
                      <span
                        className="min-w-0 font-medium flex-1"
                        style={{ color: st.text }}
                      >
                        {formatSektorLabel(s.code)}
                      </span>
                      {checked && (
                        <span className="ml-auto text-brand-600 text-xs shrink-0">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>,
              document.body,
            )
          ) : (
            <div
              role="listbox"
              aria-multiselectable
              className="absolute z-40 left-0 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
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
                    <span
                      className="min-w-0 font-medium flex-1"
                      style={{ color: st.text }}
                    >
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
        </>
      )}
    </div>
  );
}
