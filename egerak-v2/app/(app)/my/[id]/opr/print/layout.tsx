/** Laluan cetak: tiada chrome tambahan — Navbar disembunyikan melalui globals.css @media print */
export default function OprPrintRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print { @page { size: A4 portrait; margin: 8mm; } }`,
        }}
      />
      <div className="opr-print-route">{children}</div>
    </>
  );
}
