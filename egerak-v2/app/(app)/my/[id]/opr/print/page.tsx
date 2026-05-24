import { notFound } from "next/navigation";
import { getOrCreateOpr } from "@/lib/actions/opr";
import { requireUser } from "@/lib/rbac";
import { formatDateTime } from "@/lib/dates";
import PpdLogo from "@/components/PpdLogo";
import { oprPhotoDisplayUrl } from "@/lib/opr-photo-url";
import PrintToolbar from "./PrintToolbar";

export const dynamic = "force-dynamic";

export default async function OprPrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const pergerakanId = Number(id);
  if (!Number.isFinite(pergerakanId)) notFound();

  let data;
  try {
    data = await getOrCreateOpr(pergerakanId);
  } catch {
    notFound();
  }

  const p = data.pergerakan;
  const o = data.opr;
  const sektorLabel = o.sektorOverride?.name ?? p.sektor?.name ?? "";
  const photos = (o.photos ?? [])
    .map((ph) => ({ id: ph.id, src: oprPhotoDisplayUrl(ph, 500) }))
    .filter((ph): ph is { id: number; src: string } => !!ph.src);

  return (
    <>
      <PrintToolbar pergerakanId={pergerakanId} />
      <article className="opr-print max-w-[210mm] mx-auto bg-white text-black shadow-sm print:shadow-none">
        <header className="opr-print-header border-b border-black/20 pb-2 mb-2">
          <div className="flex flex-col items-center gap-1 text-center">
            <PpdLogo width={132} className="opr-print-logo" priority />
            <h1 className="text-[11pt] font-bold uppercase leading-tight">
              Laporan Pelaksanaan Program / Aktiviti
            </h1>
            <p className="text-[8pt] leading-snug">Pejabat Pendidikan Daerah Manjung</p>
          </div>
        </header>

        <section className="opr-print-meta grid grid-cols-2 gap-x-3 gap-y-0.5 text-[8pt] leading-snug mb-2">
          <p>
            <strong>Nama:</strong> {p.user?.nama}
          </p>
          <p>
            <strong>Jawatan:</strong> {p.user?.jawatan}
          </p>
          <p>
            <strong>Sektor:</strong> {sektorLabel}
          </p>
          <p>
            <strong>Program:</strong> {p.urusan}
          </p>
          <p>
            <strong>Lokasi:</strong> {p.lokasi || "-"}
          </p>
          <p>
            <strong>Tarikh:</strong> {formatDateTime(p.tarikhPergi)} – {formatDateTime(p.tarikhKembali)}
          </p>
          {o.sasaran ? (
            <p className="col-span-2">
              <strong>Sasaran:</strong> {o.sasaran}
            </p>
          ) : null}
        </section>

        <div className="opr-print-body">
          <div className="opr-print-text space-y-1.5">
            <section>
              <h2 className="opr-print-section-title">Dapatan</h2>
              <div className="opr-print-section-body whitespace-pre-wrap">{o.dapatan || "—"}</div>
            </section>
            <section>
              <h2 className="opr-print-section-title">Rumusan</h2>
              <div className="opr-print-section-body whitespace-pre-wrap">{o.rumusan || "—"}</div>
            </section>
            <section>
              <h2 className="opr-print-section-title">Refleksi</h2>
              <div className="opr-print-section-body whitespace-pre-wrap">{o.refleksi || "—"}</div>
            </section>
          </div>

          {photos.length > 0 ? (
            <aside className="opr-print-photos">
              <h2 className="opr-print-section-title mb-1">Gambar</h2>
              <div className="opr-print-photo-stack">
                {photos.map((ph) => (
                  <div key={ph.id} className="opr-print-photo-frame">
                    <img
                      src={ph.src}
                      alt=""
                      className="opr-print-photo"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </div>
            </aside>
          ) : null}
        </div>

        <footer className="opr-print-footer text-[7pt] text-slate-600 text-center">
          Dijana melalui eGerak PPD Manjung · {new Date().toLocaleDateString("ms-MY")}
        </footer>
      </article>
    </>
  );
}
