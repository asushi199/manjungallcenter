import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import { APP_DISPLAY_NAME } from "@/lib/branding";

/** Auth di middleware; jangan tunggu DB di layout (elak halaman kosong lama). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="egerak-app-shell" className="min-h-screen flex flex-col pb-20 md:pb-0">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="app-site-footer border-t bg-white text-center text-xs text-slate-500 py-3">
        {APP_DISPLAY_NAME} - Pejabat Pendidikan Daerah Manjung
      </footer>
      <BottomTabBar />
    </div>
  );
}
