"use client";

import { cn } from "@/lib/cn";

export type SortDir = "asc" | "desc";

export function SortableTh<K extends string>({
  label,
  column,
  activeColumn,
  dir,
  onSort,
  className,
}: {
  label: string;
  column: K;
  activeColumn: K;
  dir: SortDir;
  onSort: (column: K) => void;
  className?: string;
}) {
  const active = activeColumn === column;
  return (
    <th className={cn("px-3 py-2 text-left", className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 font-medium text-slate-600 hover:text-brand-700",
          active && "text-brand-800",
        )}
      >
        {label}
        <span className="text-[10px] opacity-70 tabular-nums" aria-hidden>
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}
