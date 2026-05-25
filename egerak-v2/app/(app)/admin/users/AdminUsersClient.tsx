"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminCreateUser,
  adminResetPassword,
  adminSetAktif,
  adminUpdateUser,
} from "@/lib/actions/users";
import LaporanSektorScopePicker from "@/components/LaporanSektorScopePicker";
import {
  PERANAN_SELECT_OPTIONS,
  PERANAN_LABELS,
  perananBadgeClass,
  perananUsesLaporanSektorScope,
  type UserPeranan,
} from "@/lib/roles";
import { filterSektorsForPeranan, isPenyeliaOnlySektorCode } from "@/lib/sektors";
import AdminUsersImport from "@/components/AdminUsersImport";

type Sektor = { id: number; code: string; name: string };
type Row = {
  id: number;
  username: string;
  nama: string;
  jawatan: string;
  sektorId: number | null;
  sektorCode: string | null;
  sektorName: string | null;
  peranan: UserPeranan;
  laporanSektorIds: number[];
  aktif: boolean;
  mustChangePassword: boolean;
  createdAt: string;
};

function clearPenyeliaSektorIfNeeded(
  peranan: UserPeranan,
  sektorId: string | number,
  allSektors: Sektor[],
): string | number {
  if (sektorId === "" || peranan === "Penyelia") return sektorId;
  const sek = allSektors.find((s) => s.id === Number(sektorId));
  if (sek && isPenyeliaOnlySektorCode(sek.code)) return "";
  return sektorId;
}

export default function AdminUsersClient({ users, sektors }: { users: Row[]; sektors: Sektor[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    username: "",
    password: "",
    nama: "",
    jawatan: "",
    sektorId: "" as string | number,
    peranan: "Pengguna" as UserPeranan,
    laporanSektorIds: [] as number[],
  });

  const [editing, setEditing] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState({
    username: "",
    nama: "",
    jawatan: "",
    sektorId: "" as string | number,
    peranan: "Pengguna" as UserPeranan,
    laporanSektorIds: [] as number[],
  });

  const createSektors = useMemo(
    () => filterSektorsForPeranan(sektors, form.peranan),
    [sektors, form.peranan],
  );
  const editSektors = useMemo(
    () => filterSektorsForPeranan(sektors, editForm.peranan),
    [sektors, editForm.peranan],
  );

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const res = await adminCreateUser({
        ...form,
        sektorId: form.sektorId === "" ? null : Number(form.sektorId),
        laporanSektorIds: perananUsesLaporanSektorScope(form.peranan)
          ? form.laporanSektorIds
          : [],
      });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setForm({
        username: "",
        password: "",
        nama: "",
        jawatan: "",
        sektorId: "",
        peranan: "Pengguna",
        laporanSektorIds: [],
      });
      router.refresh();
    });
  }

  function onReset(userId: number, nama: string) {
    const next = prompt(`Kata laluan baharu untuk ${nama} (min 8 aksara):`);
    if (!next) return;
    startTransition(async () => {
      const res = await adminResetPassword({ userId, newPassword: next });
      if (!res.ok) alert(res.error);
      else {
        alert("Kata laluan ditetapkan semula. Pengguna perlu tukar pada login pertama.");
        router.refresh();
      }
    });
  }

  function startEdit(u: Row) {
    setEditing(u);
    setEditForm({
      username: u.username,
      nama: u.nama,
      jawatan: u.jawatan,
      sektorId: u.sektorId ?? "",
      peranan: u.peranan,
      laporanSektorIds: u.laporanSektorIds ?? [],
    });
    setErr(null);
  }

  function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setErr(null);
    startTransition(async () => {
      const res = await adminUpdateUser({
        userId: editing.id,
        username: editForm.username,
        nama: editForm.nama,
        jawatan: editForm.jawatan,
        sektorId: editForm.sektorId === "" ? null : Number(editForm.sektorId),
        peranan: editForm.peranan,
        laporanSektorIds: perananUsesLaporanSektorScope(editForm.peranan)
          ? editForm.laporanSektorIds
          : [],
      });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  function onToggle(u: Row) {
    startTransition(async () => {
      const res = await adminSetAktif({ userId: u.id, aktif: !u.aktif });
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  }

  function UserActions({ u }: { u: Row }) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => startEdit(u)}
          disabled={pending || editing?.id === u.id}
        >
          Edit
        </button>
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => onReset(u.id, u.nama)}
          disabled={pending}
        >
          Reset PW
        </button>
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => onToggle(u)}
          disabled={pending}
        >
          {u.aktif ? "Nyahaktif" : "Aktifkan"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 rounded-md bg-slate-50 border border-slate-200 px-3 py-2">
        <strong>Tiada padam pengguna</strong> dari pangkalan data — gunakan{" "}
        <strong>Nyahaktif</strong> apabila pegawai berpindah / bersara. Rekod pergerakan & OPR kekal
        dipautkan pada akaun tersebut. Untuk pengganti jawatan, gunakan <strong>Edit</strong> pada
        baris yang sama (nama, ID, sektor, jawatan) + Reset PW.
      </p>

      <AdminUsersImport />

      {editing && (
        <div className="card p-4 border-brand-200 bg-brand-50/40">
          <h2 className="font-semibold mb-2">Edit Pengguna — {editing.username}</h2>
          <form onSubmit={onSaveEdit} className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Nama Pengguna (ID)</label>
              <input
                className="input"
                required
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Nama Penuh</label>
              <input
                className="input"
                required
                value={editForm.nama}
                onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Jawatan</label>
              <input
                className="input"
                value={editForm.jawatan}
                onChange={(e) => setEditForm({ ...editForm, jawatan: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Sektor</label>
              <select
                className="input"
                value={editForm.sektorId}
                onChange={(e) => setEditForm({ ...editForm, sektorId: e.target.value })}
              >
                <option value="">(Tiada)</option>
                {editSektors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Peranan</label>
              <select
                className="input"
                value={editForm.peranan}
                onChange={(e) => {
                  const peranan = e.target.value as UserPeranan;
                  setEditForm({
                    ...editForm,
                    peranan,
                    sektorId: clearPenyeliaSektorIfNeeded(peranan, editForm.sektorId, sektors),
                    laporanSektorIds: perananUsesLaporanSektorScope(peranan)
                      ? editForm.laporanSektorIds
                      : [],
                  });
                }}
              >
                {PERANAN_SELECT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">{PERANAN_LABELS[editForm.peranan]}</p>
            </div>
            {perananUsesLaporanSektorScope(editForm.peranan) && (
              <div className="sm:col-span-2">
                <label className="label">Sektor Laporan OPR (Timbalan)</label>
                <LaporanSektorScopePicker
                  sektors={sektors}
                  selectedIds={editForm.laporanSektorIds}
                  onChange={(laporanSektorIds) =>
                    setEditForm({ ...editForm, laporanSektorIds })
                  }
                  disabled={pending}
                />
              </div>
            )}
            {err && (
              <div className="sm:col-span-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                {err}
              </div>
            )}
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <button type="submit" className="btn-primary" disabled={pending}>
                {pending ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={pending}
                onClick={() => {
                  setEditing(null);
                  setErr(null);
                }}
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* Senarai kad — telefon */}
      <div className="md:hidden space-y-3 order-2 lg:order-1">
        {users.map((u) => (
          <div key={u.id} className="card p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-xs text-slate-500">{u.username}</div>
                <div className="font-semibold">{u.nama}</div>
                <div className="text-sm text-slate-600">{u.jawatan || "—"}</div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={"badge " + perananBadgeClass(u.peranan)}>
                  {PERANAN_SELECT_OPTIONS.find((o) => o.value === u.peranan)?.label ?? u.peranan}
                </span>
                <span
                  className={
                    "badge " +
                    (u.aktif
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-700")
                  }
                >
                  {u.aktif ? "Aktif" : "Tidak Aktif"}
                </span>
              </div>
            </div>
            {u.sektorName && (
              <p className="text-xs text-slate-600 leading-snug">{u.sektorName}</p>
            )}
            {u.mustChangePassword && (
              <span className="badge bg-yellow-100 text-yellow-800">Tukar PW</span>
            )}
            <UserActions u={u} />
          </div>
        ))}
        {users.length === 0 && (
          <div className="card p-6 text-center text-slate-500 text-sm">Tiada pengguna.</div>
        )}
      </div>

      <div className="card overflow-x-auto hidden md:block order-2 lg:order-1">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Nama / Jawatan</th>
              <th className="px-3 py-2 text-left">Sektor</th>
              <th className="px-3 py-2 text-left">Peranan</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2 font-mono">{u.username}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{u.nama}</div>
                  <div className="text-xs text-slate-500">{u.jawatan}</div>
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">{u.sektorName ?? "-"}</td>
                <td className="px-3 py-2">
                  <span className={"badge " + perananBadgeClass(u.peranan)}>
                    {PERANAN_SELECT_OPTIONS.find((o) => o.value === u.peranan)?.label ?? u.peranan}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={
                      "badge " +
                      (u.aktif
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-700")
                    }
                  >
                    {u.aktif ? "Aktif" : "Tidak Aktif"}
                  </span>
                  {u.mustChangePassword && (
                    <span className="badge bg-yellow-100 text-yellow-800 ml-1">Tukar PW</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <UserActions u={u} />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-500">
                  Tiada pengguna.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card p-4 order-1 lg:order-2">
        <h2 className="font-semibold mb-2">Tambah Pengguna</h2>
        <form onSubmit={onCreate} className="space-y-3">
          <div>
            <label className="label">Nama Pengguna (ID)</label>
            <input
              className="input"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Kata Laluan Awal</label>
            <input
              className="input"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1">
              Pengguna perlu tukar pada login pertama.
            </p>
          </div>
          <div>
            <label className="label">Nama Penuh</label>
            <input
              className="input"
              required
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Jawatan</label>
            <input
              className="input"
              value={form.jawatan}
              onChange={(e) => setForm({ ...form, jawatan: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Sektor</label>
            <select
              className="input"
              value={form.sektorId}
              onChange={(e) => setForm({ ...form, sektorId: e.target.value })}
            >
              <option value="">(Tiada)</option>
              {createSektors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {form.peranan === "Penyelia" && (
              <p className="text-xs text-slate-500 mt-1">
                Untuk Ketua PPD / pentadbiran, pilih <strong>Pegawai PPD</strong>.
              </p>
            )}
          </div>
          <div>
            <label className="label">Peranan</label>
            <select
              className="input"
              value={form.peranan}
              onChange={(e) => {
                const peranan = e.target.value as UserPeranan;
                setForm({
                  ...form,
                  peranan,
                  sektorId: clearPenyeliaSektorIfNeeded(peranan, form.sektorId, sektors),
                  laporanSektorIds: perananUsesLaporanSektorScope(peranan)
                    ? form.laporanSektorIds
                    : [],
                });
              }}
            >
              {PERANAN_SELECT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">{PERANAN_LABELS[form.peranan]}</p>
          </div>
          {perananUsesLaporanSektorScope(form.peranan) && (
            <div>
              <label className="label">Sektor Laporan OPR (Timbalan)</label>
              <LaporanSektorScopePicker
                sektors={sektors}
                selectedIds={form.laporanSektorIds}
                onChange={(laporanSektorIds) => setForm({ ...form, laporanSektorIds })}
                disabled={pending}
              />
            </div>
          )}
          {err && (
            <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
              {err}
            </div>
          )}
          <button className="btn-primary w-full" disabled={pending}>
            {pending ? "Menyimpan..." : "Tambah Pengguna"}
          </button>
        </form>
      </div>
    </div>
    </div>
  );
}
