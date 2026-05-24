"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminCreateUser,
  adminResetPassword,
  adminSetAktif,
} from "@/lib/actions/users";

type Sektor = { id: number; code: string; name: string };
type Row = {
  id: number;
  username: string;
  nama: string;
  jawatan: string;
  sektorId: number | null;
  sektorCode: string | null;
  sektorName: string | null;
  peranan: "Admin" | "Pengguna";
  aktif: boolean;
  mustChangePassword: boolean;
  createdAt: string;
};

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
    peranan: "Pengguna" as "Admin" | "Pengguna",
  });

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const res = await adminCreateUser({
        ...form,
        sektorId: form.sektorId === "" ? null : Number(form.sektorId),
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

  function onToggle(u: Row) {
    startTransition(async () => {
      const res = await adminSetAktif({ userId: u.id, aktif: !u.aktif });
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="card overflow-x-auto">
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
                  <span
                    className={
                      "badge " +
                      (u.peranan === "Admin"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700")
                    }
                  >
                    {u.peranan}
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
                <td className="px-3 py-2 space-x-1 whitespace-nowrap">
                  <button
                    className="btn-secondary"
                    onClick={() => onReset(u.id, u.nama)}
                    disabled={pending}
                  >
                    Reset PW
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => onToggle(u)}
                    disabled={pending}
                  >
                    {u.aktif ? "Nyahaktif" : "Aktifkan"}
                  </button>
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

      <div className="card p-4">
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
              {sektors.map((s) => (
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
              value={form.peranan}
              onChange={(e) =>
                setForm({ ...form, peranan: e.target.value as "Admin" | "Pengguna" })
              }
            >
              <option value="Pengguna">Pengguna</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
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
  );
}
