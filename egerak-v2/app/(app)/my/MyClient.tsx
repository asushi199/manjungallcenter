"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { deletePergerakanIds } from "@/lib/actions/pergerakan";
import { sektorRowStyle } from "@/lib/sektor-colors";
import { oprStatusBadge } from "@/lib/opr-status";
import { SortableTh, type SortDir } from "@/components/SortableTh";

type SortKey = "urusan" | "lokasi" | "sektor" | "tarikh" | "tindakan";

const OPR_SORT_RANK: Record<string, number> = { SIAP: 2, DRAFT: 1 };

function compareItems(a: Item, b: Item, key: SortKey): number {
  switch (key) {
    case "urusan":
      return a.urusan.localeCompare(b.urusan, "ms") || a.jenis.localeCompare(b.jenis, "ms");
    case "lokasi":
      return (a.lokasi || "").localeCompare(b.lokasi || "", "ms");
    case "sektor":
      return (a.sektorName || "").localeCompare(b.sektorName || "", "ms");
    case "tarikh":
      return new Date(a.tarikhPergi).getTime() - new Date(b.tarikhPergi).getTime();
    case "tindakan": {
      const ra = OPR_SORT_RANK[a.oprStatus ?? ""] ?? 0;
      const rb = OPR_SORT_RANK[b.oprStatus ?? ""] ?? 0;
      return ra - rb || a.urusan.localeCompare(b.urusan, "ms");
    }
    default:
      return 0;
  }
}

type Item = {
  id: number;
  jenis: "Pergerakan" | "Bercuti";
  urusan: string;
  lokasi: string;
  sektorCode: string | null;
  sektorName: string | null;
  tarikhPergi: string;
  tarikhKembali: string;
  oprStatus: "DRAFT" | "SIAP" | null;
};

export default function MyClient({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("tarikh");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = items.filter((it) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      it.urusan.toLowerCase().includes(q) ||
      it.lokasi.toLowerCase().includes(q) ||
      (it.sektorName ?? "").toLowerCase().includes(q)
    );
  });

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const c = compareItems(a, b, sortKey);
      return sortDir === "asc" ? c : -c;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  function onSort(column: SortKey) {
    if (sortKey === column) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(column);
      setSortDir(column === "tarikh" ? "desc" : "asc");
    }
  }

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map((i) => i.id)));
  }

  function onDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Padam ${selected.size} rekod?`)) return;
    startTransition(async () => {
      const r = await deletePergerakanIds([...selected]);
      alert(`${r.deleted} rekod dipadam.`);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input flex-1 min-w-[200px]"
          placeholder="Carian urusan / lokasi / sektor..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="btn-danger"
          disabled={selected.size === 0 || pending}
          onClick={onDelete}
        >
          {pending ? "Memadam..." : `Padam (${selected.size})`}
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left w-8">
                <input
                  type="checkbox"
                  checked={sorted.length > 0 && selected.size === sorted.length}
                  onChange={toggleAll}
                />
              </th>
              <SortableTh
                label="Urusan"
                column="urusan"
                activeColumn={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                label="Lokasi"
                column="lokasi"
                activeColumn={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                label="Sektor"
                column="sektor"
                activeColumn={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                label="Tarikh"
                column="tarikh"
                activeColumn={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                label="Tindakan"
                column="tindakan"
                activeColumn={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">
                  Tiada rekod.
                </td>
              </tr>
            )}
            {sorted.map((it) => {
              const rowStyle = sektorRowStyle(it.sektorCode, it.jenis);
              return (
                <tr key={it.id} className="border-t border-black/5" style={rowStyle}>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      checked={selected.has(it.id)}
                      onChange={() => toggle(it.id)}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div>
                      <span className="font-medium text-slate-900">{it.urusan}</span>
                    </div>
                    {it.jenis === "Bercuti" && (
                      <span className="badge bg-emerald-100 text-emerald-700 mt-1">Bercuti</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-slate-600">{it.lokasi || "-"}</td>
                  <td className="px-3 py-2 align-top text-slate-600">
                    {it.sektorName ?? "-"}
                  </td>
                  <td className="px-3 py-2 align-top text-slate-600 whitespace-nowrap">
                    {format(new Date(it.tarikhPergi), "dd-MM-yyyy HH:mm")}
                    <br />
                    <span className="text-xs">
                      hingga {format(new Date(it.tarikhKembali), "dd-MM-yyyy HH:mm")}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/my/${it.id}/edit`}
                        className="text-xs text-brand-600 hover:underline font-medium"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/my/${it.id}/opr`}
                        className="text-xs text-slate-600 hover:underline"
                      >
                        OPR
                      </Link>
                      {(() => {
                        const badge = oprStatusBadge(it.oprStatus ?? undefined);
                        return badge ? (
                          <span className={`badge ${badge.className} w-fit`}>{badge.label}</span>
                        ) : null;
                      })()}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
