import { notFound } from "next/navigation";
import { getOrCreateOpr } from "@/lib/actions/opr";
import { requireUser } from "@/lib/rbac";
import { formatDateTime } from "@/lib/dates";
import PpdLogo from "@/components/PpdLogo";
import { oprPhotoDisplayUrl } from "@/lib/opr-photo-url";
import PrintToolbar from "./PrintToolbar";

export const dynamic = "force-dynamic";

type TextBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] };

function splitIntoBlocks(raw: string | null | undefined): TextBlock[] {
  const lines = (raw ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: TextBlock[] = [];

  let cur: string[] = [];
  const flush = () => {
    if (cur.length === 0) return;
    const nonEmpty = cur.join("\n").trimEnd();
    if (!nonEmpty.trim()) {
      cur = [];
      return;
    }

    const bulletRe = /^\s*(?:-|\u2022)\s+/;
    const isAllBullets = cur.every((l) => !l.trim() || bulletRe.test(l));
    if (isAllBullets) {
      const items = cur
        .map((l) => l.replace(bulletRe, "").trim())
        .filter(Boolean);
      if (items.length) blocks.push({ kind: "ul", items });
    } else {
      blocks.push({ kind: "p", text: nonEmpty });
    }
    cur = [];
  };

  for (const l of lines) {
    if (l.trim() === "") {
      flush();
      continue;
    }
    cur.push(l);
  }
  flush();
  return blocks;
}

function OprPrintText({ value }: { value: string | null | undefined }) {
  const blocks = splitIntoBlocks(value);
  if (blocks.length === 0) return <span>—</span>;
  return (
    <div className="opr-print-rich">
      {blocks.map((b, idx) => {
        if (b.kind === "ul") {
          return (
            <ul key={`ul-${idx}`}>
              {b.items.map((it, i) => (
                <li key={`li-${idx}-${i}`}>{it}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`p-${idx}`} className="whitespace-pre-wrap">
            {b.text}
          </p>
        );
      })}
    </div>
  );
}

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
              <div className="opr-print-section-body">
                <OprPrintText value={o.dapatan} />
              </div>
            </section>
            <section>
              <h2 className="opr-print-section-title">Rumusan</h2>
              <div className="opr-print-section-body">
                <OprPrintText value={o.rumusan} />
              </div>
            </section>
            <section>
              <h2 className="opr-print-section-title">Refleksi</h2>
              <div className="opr-print-section-body">
                <OprPrintText value={o.refleksi} />
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
          Dijana melalui eGerak PPD Manjung · {new Date().toLocaleDateString("ms-MY")}
        </footer>
      </article>
    </>
  );
}
