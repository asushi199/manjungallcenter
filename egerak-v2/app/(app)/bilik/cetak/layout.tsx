/** Laluan cetak jadual bilik — navigasi disembunyikan melalui globals.css @media print */
export default function BilikCetakLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print {
            @page bilik-sheet { size: A4 landscape; margin: 5mm; }
            .bilik-print { page: bilik-sheet; }
          }`,
        }}
      />
      <div className="bilik-print-route">{children}</div>
    </>
  );
}
