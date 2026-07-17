import { oprPrintPageCss } from "@/lib/opr-print-page";

/** Laluan cetak: tiada chrome tambahan — Navbar disembunyikan melalui globals.css @media print */
export default function OprPrintRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: oprPrintPageCss() }} />
      <div className="opr-print-route">{children}</div>
    </>
  );
}
