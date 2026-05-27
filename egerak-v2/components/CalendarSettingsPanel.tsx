"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  saveUserCalendarSettings,
  type CalendarWeekStartsOn,
} from "@/lib/actions/calendar-settings";

type Props = {
  weekStartsOn: CalendarWeekStartsOn;
};

export default function CalendarSettingsPanel({ weekStartsOn }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const [nextWeekStartsOn, setNextWeekStartsOn] = useState<CalendarWeekStartsOn>(weekStartsOn);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      const inside =
        (btnRef.current && btnRef.current.contains(t)) ||
        (panelRef.current && panelRef.current.contains(t));
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

  useEffect(() => {
    if (!open) return;
    function compute() {
      const btn = btnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const panelWidth = 280;
      const margin = 8;
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - panelWidth - margin));
      const top = rect.bottom + 8;
      setPos({ top, left });
    }
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open]);

  useEffect(() => {
    setNextWeekStartsOn(weekStartsOn);
  }, [weekStartsOn]);

  const changed = useMemo(() => {
    return nextWeekStartsOn !== weekStartsOn;
  }, [nextWeekStartsOn, weekStartsOn]);

  function onSave() {
    if (!changed) return;
    startTransition(async () => {
      const res = await saveUserCalendarSettings({
        weekStartsOn: nextWeekStartsOn,
      });
      if (!res.ok) {
        alert(res.error ?? "Gagal simpan tetapan");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="btn-secondary inline-flex items-center justify-center px-2.5 py-1.5"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Tetapan kalendar"
        disabled={pending}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="shrink-0"
        >
          <path d="M4 21v-7" />
          <path d="M4 10V3" />
          <path d="M12 21v-9" />
          <path d="M12 8V3" />
          <path d="M20 21v-5" />
          <path d="M20 12V3" />
          <path d="M2 10h4" />
          <path d="M10 8h4" />
          <path d="M18 16h4" />
        </svg>
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            className="rounded-lg border border-slate-200 bg-white shadow-xl p-4 space-y-4"
            style={{ position: "fixed", top: pos.top, left: pos.left, width: 280, zIndex: 200 }}
          >
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900">Tetapan Kalendar</h3>
              <p className="text-xs text-slate-500">Tukarkan pilihan dan tekan Simpan.</p>
            </div>

            <div>
              <label className="label text-xs text-slate-700">Minggu bermula</label>
              <select
                className="input"
                value={nextWeekStartsOn}
                disabled={pending}
                onChange={(e) => setNextWeekStartsOn(e.target.value as CalendarWeekStartsOn)}
              >
                <option value="mon">Isnin (Mon)</option>
                <option value="sun">Ahad (Sun)</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <button type="button" className="btn-secondary" disabled={pending} onClick={() => setOpen(false)}>
                Batal
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={pending || !changed}
                onClick={onSave}
              >
                {pending ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
