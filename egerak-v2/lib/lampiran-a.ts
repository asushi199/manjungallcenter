import { readFileSync } from "fs";
import { join } from "path";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/dates";
import { formatTitleCase } from "@/lib/format-display-text";

export type LampiranAFields = {
  nama: string;
  jawatan: string;
  bahagian: string;
  lokasi: string;
  urusan: string;
  tempoh: string;
};

const TEMPLATE_PATH = join(process.cwd(), "public/templates/lampiran-a-template.docx");

/** Format tarikh TEMPOH dalam borang (dd/MM/yyyy). */
export function formatLampiranTempoh(pergi: Date, kembali: Date): string {
  const fmt = (d: Date) => formatInTimeZone(d, TZ, "dd/MM/yyyy");
  const start = fmt(pergi);
  const end = fmt(kembali);
  if (start === end) return start;
  return `${start} – ${end}`;
}

export function buildLampiranAFields(params: {
  nama: string;
  jawatan: string;
  sektorName: string | null;
  lokasi: string;
  urusan: string;
  tarikhPergi: Date;
  tarikhKembali: Date;
}): LampiranAFields {
  const bahagianRaw = params.sektorName
    ? `${params.sektorName}, PPD Manjung`
    : "PPD Manjung";

  return {
    nama: formatTitleCase(params.nama),
    jawatan: formatTitleCase(params.jawatan),
    bahagian: formatTitleCase(bahagianRaw),
    lokasi: formatTitleCase(params.lokasi),
    urusan: formatTitleCase(params.urusan),
    tempoh: formatLampiranTempoh(params.tarikhPergi, params.tarikhKembali),
  };
}

export function generateLampiranADocx(fields: LampiranAFields): Buffer {
  const content = readFileSync(TEMPLATE_PATH);
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "[[", end: "]]" },
  });
  doc.render(fields);
  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}

/** Nama fail muat turun — elak aksara tidak sah. */
export function lampiranADownloadFilename(pergerakanId: number, urusan: string): string {
  const slug = urusan
    .trim()
    .slice(0, 40)
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const base = slug || `pergerakan-${pergerakanId}`;
  return `Lampiran-A_${base}.docx`;
}
