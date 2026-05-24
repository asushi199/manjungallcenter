"use client";

import { filterSektorsForLaporanScope } from "@/lib/laporan-sektor-scope";

type Sektor = { id: number; code: string; name: string };

export default function LaporanSektorScopePicker({
  sektors,
  selectedIds,
  onChange,
  disabled,
}: {
  sektors: Sektor[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}) {
  const options = filterSektorsForLaporanScope(sektors);

  function toggle(id: number) {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Pilih sektor yang timbalan ini boleh lihat dalam Laporan OPR (bukan Pegawai PPD).
      </p>
      <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-md p-2 bg-white">
        {options.map((s) => (
          <label
            key={s.id}
            className="flex items-start gap-2 text-sm cursor-pointer rounded px-1 py-0.5 hover:bg-slate-50"
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={selectedIds.includes(s.id)}
              disabled={disabled}
              onChange={() => toggle(s.id)}
            />
            <span>{s.name}</span>
          </label>
        ))}
      </div>
      {selectedIds.length === 0 && (
        <p className="text-xs text-amber-700">Pilih sekurang-kurangnya satu sektor.</p>
      )}
    </div>
  );
}
