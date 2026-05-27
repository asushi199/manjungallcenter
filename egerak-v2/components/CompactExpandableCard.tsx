"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const CardExpandContext = createContext(false);

export function ClampText({ children, className }: { children: ReactNode; className?: string }) {
  const expanded = useContext(CardExpandContext);
  return (
    <div data-clamp className={cn("min-w-0", !expanded && "truncate", className)}>
      {children}
    </div>
  );
}

export type CompactCardTone = "holiday" | "leave" | "pergerakan";

export default function CompactExpandableCard({
  title,
  subtitle,
  tone,
  stripeColor,
  trailing,
  children,
  footer,
  className,
}: {
  title: string;
  subtitle?: string;
  tone?: CompactCardTone;
  stripeColor?: string;
  /** Badges / links on the right of the header row */
  trailing?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;

    const check = () => {
      if (expanded) {
        setHasOverflow(true);
        return;
      }
      const nodes = root.querySelectorAll<HTMLElement>("[data-clamp]");
      const any = Array.from(nodes).some(
        (el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1,
      );
      setHasOverflow(any);
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(root);
    window.addEventListener("resize", check);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [expanded, title, subtitle, children, footer, trailing]);

  return (
    <CardExpandContext.Provider value={expanded}>
      <div
        className={cn(
          "rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden",
          className,
        )}
      >
        <div className="flex">
          <div
            className="w-1.5 shrink-0"
            style={{ backgroundColor: stripeColor ?? "#e2e8f0" }}
            aria-hidden
          />
          <div ref={bodyRef} className="p-2.5 min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <ClampText className="font-semibold text-slate-900">{title}</ClampText>
                {subtitle ? (
                  <div className="mt-0.5">
                    <ClampText className="text-xs text-slate-500">{subtitle}</ClampText>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-1 shrink-0 justify-end">
                {tone ? (
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      tone === "holiday" && "bg-rose-50 text-rose-800 border-rose-200",
                      tone === "leave" && "bg-emerald-50 text-emerald-800 border-emerald-200",
                      tone === "pergerakan" && "bg-slate-50 text-slate-700 border-slate-200",
                    )}
                  >
                      {tone === "holiday" ? "Cuti" : tone === "leave" ? "Bercuti" : "Pergerakan"}
                    </span>
                ) : null}
                {trailing}
              </div>
            </div>
            {children ? (
              <div className={cn("mt-1.5 text-sm text-slate-700", expanded && "space-y-1")}>
                {children}
              </div>
            ) : null}
            {footer ? <div className="mt-2">{footer}</div> : null}
            {hasOverflow ? (
              <button
                type="button"
                className="mt-2 w-full text-center text-[11px] font-semibold text-brand-700 hover:text-brand-800 py-1 rounded-md hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
              >
                {expanded ? "Tutup ▴" : "Butiran penuh ▾"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </CardExpandContext.Provider>
  );
}
