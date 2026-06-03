/**
 * Satu kali: tukar docs/Lampiran-A_*.docx → public/templates/lampiran-a-template.docx
 * dengan placeholder docxtemplater {nama}, {jawatan}, dll.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import PizZip from "pizzip";

const root = join(process.cwd());
const src = join(root, "docs", "Lampiran-A_1780479522.docx");
const dest = join(root, "public", "templates", "lampiran-a-template.docx");

if (!existsSync(src)) {
  console.error("Sumber templat tidak dijumpai:", src);
  process.exit(1);
}

const zip = new PizZip(readFileSync(src));
const docEntry = zip.file("word/document.xml");
if (!docEntry) {
  console.error("word/document.xml tidak dijumpai dalam .docx");
  process.exit(1);
}

let xml = docEntry.asText();

const replacements: Array<[string, string]> = [
  ["Ong Chong Xiao", "[[nama]]"],
  [
    "Penolong Ppd Sumber &amp; Teknologi Pendidikan (ustp)",
    "[[jawatan]]",
  ],
  ["Sektor Pembelajaran, PPD Manjung", "[[bahagian]]"],
  ["Padang Smk Dato&#039; Idris", "[[lokasi]]"],
  [
    "Khidmat Bantu Pegawai Ustp Manjung Bagi Program Kejohanan Olahraga Smk Dato&#039; Idris 2026",
    "[[urusan]]",
  ],
  // Tempoh aktiviti (bukan tarikh tandatangan)
  ["<w:t>21/05/2026</w:t>", "<w:t>[[tempoh]]</w:t>"],
  // Tarikh tandatangan — biarkan kosong untuk isi manual
  [
    '<w:t xml:space="preserve">  20/05/2026</w:t>',
    '<w:t xml:space="preserve">  </w:t>',
  ],
];

for (const [from, to] of replacements) {
  if (!xml.includes(from)) {
    console.warn("Amaran: teks tidak dijumpai:", from.slice(0, 60));
  }
  xml = xml.split(from).join(to);
}

zip.file("word/document.xml", xml);

mkdirSync(join(root, "public", "templates"), { recursive: true });
writeFileSync(dest, zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));
console.log("OK →", dest);
