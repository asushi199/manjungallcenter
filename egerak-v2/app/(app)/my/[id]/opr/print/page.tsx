import { notFound } from "next/navigation";
import { getOrCreateOpr } from "@/lib/actions/opr";
import { requireUser } from "@/lib/rbac";
import { formatDateTime } from "@/lib/dates";
import PpdLogo from "@/components/PpdLogo";
import { oprPhotoDisplayUrl } from "@/lib/opr-photo-url";
import { formatTitleCase } from "@/lib/format-display-text";
import OprRichText from "@/components/OprRichText";
import { APP_DISPLAY_NAME } from "@/lib/branding";
import PrintToolbar from "./PrintToolbar";
import OprPrintScaler from "./OprPrintScaler";

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
  const sektorLabel = formatTitleCase(o.sektorOverride?.name ?? p.sektor?.name ?? "");
  const photos = (o.photos ?? [])
    .map((ph) => ({ id: ph.id, src: oprPhotoDisplayUrl(ph, 500) }))
    .filter((ph): ph is { id: number; src: string } => !!ph.src);

  return (
    <>
      <PrintToolbar pergerakanId={pergerakanId} />
      <OprPrintScaler>
      <article className="opr-print max-w-[210mm] mx-auto bg-white text-black shadow-sm print:shadow-none">
        <header className="opr-print-header border-b border-black/20 pb-2 mb-2">
          <div className="flex flex-col items-center gap-1 text-center">
            <PpdLogo width={132} className="opr-print-logo" priority />
            <h1 className="text-[11pt] font-bold uppercase leading-tight">
              OPR Pelaksanaan Program / Aktiviti
            </h1>
            <p className="text-[8pt] leading-snug">Pejabat Pendidikan Daerah Manjung</p>
          </div>
        </header>

        <section className="opr-print-meta grid grid-cols-2 gap-x-3 gap-y-0.5 text-[8pt] leading-snug mb-2">
          <p>
            <strong>Nama:</strong> {formatTitleCase(p.user?.nama ?? "")}
          </p>
          <p>
            <strong>Jawatan:</strong> {formatTitleCase(p.user?.jawatan ?? "")}
          </p>
          <p>
            <strong>Sektor:</strong> {sektorLabel}
          </p>
          <p>
            <strong>Fokus:</strong> {o.fokus || "-"}
          </p>
          <p>
            <strong>Program:</strong> {formatTitleCase(p.urusan ?? "")}
          </p>
          <p>
            <strong>Lokasi:</strong> {p.lokasi ? formatTitleCase(p.lokasi) : "-"}
          </p>
          <p>
            <strong>Tarikh:</strong> {formatDateTime(p.tarikhPergi)} – {formatDateTime(p.tarikhKembali)}
          </p>
          {o.sasaran ? (
            <p className="col-span-2">
              <strong>Sasaran:</strong> {formatTitleCase(o.sasaran)}
            </p>
          ) : null}
        </section>

        <div className="opr-print-body">
          <div className="opr-print-text space-y-1.5">
            <section>
              <h2 className="opr-print-section-title">Dapatan</h2>
              <div className="opr-print-section-body">
                <OprRichText value={o.dapatan} />
              </div>
            </section>
            <section>
              <h2 className="opr-print-section-title">Rumusan</h2>
              <div className="opr-print-section-body">
                <OprRichText value={o.rumusan} />
              </div>
            </section>
            <section>
              <h2 className="opr-print-section-title">Refleksi</h2>
              <div className="opr-print-section-body">
                <OprRichText value={o.refleksi} />
              </div>
            </section>
          </div>
        </div>

        {photos.length > 0 ? (
          <section className="opr-print-photos">
            <h2 className="opr-print-section-title mb-1">Gambar aktiviti</h2>
            <div className="opr-print-photo-grid">
              {photos.slice(0, 4).map((ph) => (
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
          </section>
        ) : null}

        <footer className="opr-print-footer text-[7pt] text-slate-600 text-center">
          Dijana melalui {APP_DISPLAY_NAME} · {new Date().toLocaleDateString("ms-MY")}
        </footer>
      </article>
      </OprPrintScaler>
    </>
  );
}
