"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { changePassword } from "@/lib/actions/account";

export default function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const { update } = useSession();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await changePassword({
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirm,
      });
      if (!res.ok) {
        setError(res.error ?? "Gagal menukar kata laluan");
        return;
      }
      // Refresh JWT
      await update({ mustChangePassword: false });
      setOkMsg("Kata laluan ditukar. Mengalihkan...");
      setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 800);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label">Kata Laluan Semasa</label>
        <input
          type="password"
          className="input"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Kata Laluan Baharu (min 8 aksara)</label>
        <input
          type="password"
          className="input"
          required
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Sahkan Kata Laluan Baharu</label>
        <input
          type="password"
          className="input"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}
      {okMsg && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-3 py-2">
          {okMsg}
        </div>
      )}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Memproses..." : "Tukar Kata Laluan"}
      </button>
      {!forced && (
        <p className="text-xs text-slate-500">
          Klik <strong>Log Keluar</strong> di menu atas selepas tukar untuk log masuk semula
          jika perlu.
        </p>
      )}
    </form>
  );
}
