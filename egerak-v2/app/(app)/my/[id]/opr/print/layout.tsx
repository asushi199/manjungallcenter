/** Laluan cetak: tiada chrome tambahan — Navbar disembunyikan melalui globals.css @media print */
export default function OprPrintRouteLayout({ children }: { children: React.ReactNode }) {
  return <div className="opr-print-route">{children}</div>;
}
