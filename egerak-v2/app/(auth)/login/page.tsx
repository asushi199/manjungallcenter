import PpdLogo from "@/components/PpdLogo";
import { APP_DISPLAY_NAME } from "@/lib/branding";
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
      <header className="flex flex-col items-center gap-1 border-b border-slate-100 pb-5 mb-6">
        <PpdLogo width={112} priority className="drop-shadow-sm" />
        <h1 className="text-xl font-bold text-brand-700 leading-tight">{APP_DISPLAY_NAME}</h1>
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
