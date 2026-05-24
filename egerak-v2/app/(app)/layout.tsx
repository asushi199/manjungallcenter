import Navbar from "@/components/Navbar";
import { requireUser } from "@/lib/rbac";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div id="egerak-app-shell" className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="app-site-footer border-t bg-white text-center text-xs text-slate-500 py-3">
        eGerak PPD Manjung v2 - Pejabat Pendidikan Daerah Manjung
      </footer>
    </div>
  );
}
