import Image from "next/image";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="card p-8 pt-7">
      <header className="flex flex-col items-center gap-1.5 border-b border-slate-100 pb-5 mb-6">
        <Image
          src="/logo/sentra-full.png"
          alt="Logo SentRa ManjungHebat"
          width={768}
          height={768}
          priority
          className="h-auto w-44 drop-shadow-sm"
        />
        <h1 className="text-center text-sm font-semibold uppercase tracking-wide text-brand-700 leading-snug">
          Pejabat Pendidikan Daerah Manjung
        </h1>
      </header>
      <p className="text-sm text-slate-600 mb-6">
        Sila log masuk dengan ID dan kata laluan anda.
      </p>
      <LoginForm callbackUrl={sp.from ?? "/dashboard"} initialError={sp.error} />
      <p className="text-xs text-slate-500 mt-6">
        Lupa kata laluan? Hubungi Pentadbir Sistem.
      </p>
    </div>
  );
}
