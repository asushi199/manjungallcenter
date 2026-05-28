"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  const isToggleable = hasOverflow;

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

  const hintChevron = useMemo(() => {
    if (!isToggleable) return null;
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={cn("text-slate-400 transition-transform", expanded ? "rotate-180" : "rotate-0")}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    );
  }, [expanded, isToggleable]);

  function shouldIgnoreToggle(target: EventTarget | null) {
    const el = target as HTMLElement | null;
    if (!el) return true;
    return Boolean(
      el.closest(
        "button,a,input,select,textarea,label,[data-no-toggle]",
      ),
    );
  }

  return (
    <CardExpandContext.Provider value={expanded}>
      <div
        className={cn(
          "rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden",
          isToggleable && "cursor-pointer hover:shadow-md hover:border-slate-300 transition-shadow",
          className,
        )}
        role={isToggleable ? "button" : undefined}
        tabIndex={isToggleable ? 0 : undefined}
        aria-expanded={isToggleable ? expanded : undefined}
        onClick={(e) => {
          if (!isToggleable) return;
          if (shouldIgnoreToggle(e.target)) return;
          setExpanded((v) => !v);
        }}
        onKeyDown={(e) => {
          if (!isToggleable) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
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
              <div className="flex items-center gap-1 shrink-0 justify-end">
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
                {hintChevron ? <span className="ml-0.5">{hintChevron}</span> : null}
              </div>
            </div>
            {children ? (
              <div className={cn("mt-1.5 text-sm text-slate-700", expanded && "space-y-1")}>
                {children}
              </div>
            ) : null}
            {footer ? (
              <div className="mt-2" data-no-toggle>
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </CardExpandContext.Provider>
  );
}
