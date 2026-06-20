"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    if (!res || res.error) {
      setError("ID atau kata laluan tidak betul.");
      setBusy(false);
      return;
    }
    router.replace(callbackUrl || "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="username">
          No. Kad Pengenalan (IC)
        </label>
        <input
          id="username"
          className="input"
          autoComplete="username"
          autoFocus
          inputMode="numeric"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Kata Laluan
        </label>
        <input
          id="password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "Memproses…" : "Log Masuk"}
      </button>
    </form>
  );
}
