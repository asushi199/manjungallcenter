"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { deletePergerakanIds } from "@/lib/actions/pergerakan";
import { sektorRowStyle } from "@/lib/sektor-colors";
import { oprStatusBadge } from "@/lib/opr-status";

type Item = {
  id: number;
  nama: string;
  jenis: "Pergerakan" | "Bercuti";
  urusan: string;
  lokasi: string;
  sektorCode: string | null;
  sektorName: string | null;
  tarikhPergi: string;
  tarikhKembali: string;
  oprStatus: "DRAFT" | "SIAP" | null;
};

export default function AdminPergerakanClient({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.nama.toLowerCase().includes(q) ||
        it.urusan.toLowerCase().includes(q) ||
        it.lokasi.toLowerCase().includes(q) ||
        (it.sektorName ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((i) => i.id)));
  }

  function onDelete() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Padam ${selected.size} pergerakan?\n\nTempahan bilik yang berkaitan akan dibatalkan secara automatik.`,
      )
    )
      return;
    startTransition(async () => {
      const r = await deletePergerakanIds([...selected]);
      alert(`${r.deleted} rekod dipadam.`);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
        Padam di sini akan <strong>nyahaktifkan pergerakan</strong> dan{" "}
        <strong>batalkan tempahan bilik</strong> yang dipautkan. Laporan OPR siap tidak lagi
        dipaparkan dalam ringkasan.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input flex-1 min-w-[200px]"
          placeholder="Carian nama / urusan / sektor..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className="btn-danger"
          disabled={selected.size === 0 || pending}
          onClick={onDelete}
        >
          {pending ? "Memadam..." : `Padam dipilih (${selected.size})`}
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-3 py-2 text-left">Pegawai</th>
              <th className="px-3 py-2 text-left">Urusan</th>
              <th className="px-3 py-2 text-left">Tarikh</th>
              <th className="px-3 py-2 text-left">OPR</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-500">
                  Tiada rekod aktif.
                </td>
              </tr>
            )}
            {filtered.map((it) => {
              const rowStyle = sektorRowStyle(it.sektorCode, it.jenis);
              const badge = oprStatusBadge(it.oprStatus ?? undefined);
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
                    <div className="font-medium">{it.nama}</div>
                    <div className="text-xs text-slate-600">{it.sektorName ?? "—"}</div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    {it.urusan}
                    {it.lokasi ? (
                      <div className="text-xs text-slate-600">{it.lokasi}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 align-top whitespace-nowrap text-slate-700">
                    {format(new Date(it.tarikhPergi), "dd-MM-yyyy")}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {badge ? (
                      <span className={`badge ${badge.className}`}>{badge.label}</span>
                    ) : (
                      "—"
                    )}
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
