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
  // Tarikh tandatangan pemohon — kosong tetapi lebar tetap (sama panjang 20/05/2026)
  // supaya tab kanan Ketua tidak lari ke kiri.
  [
    '<w:t xml:space="preserve">  20/05/2026</w:t>',
    '<w:t xml:space="preserve">            </w:t>',
  ],
];

for (const [from, to] of replacements) {
  if (!xml.includes(from)) {
    console.warn("Amaran: teks tidak dijumpai:", from.slice(0, 60));
  }
  xml = xml.split(from).join(to);
}

// Layout: gabung "Tarik"+"h", kecilkan fon TEMPOH, elak wrap
const brokenTarikh =
  '<w:r w:rsidR="00AA03C8"><w:t>Tarik</w:t></w:r><w:r w:rsidR="00B62958"><w:t>h</w:t></w:r><w:r w:rsidR="00581BFD"><w:tab/><w:t>:</w:t></w:r>';
const fixedTarikh =
  '<w:r w:rsidR="00AA03C8"><w:t xml:space="preserve">Tarikh </w:t></w:r><w:r w:rsidR="00581BFD"><w:tab/><w:t>:</w:t></w:r>';
xml = xml.split(brokenTarikh).join(fixedTarikh);

xml = xml
  .split("<w:r><w:rPr><w:b/></w:rPr><w:t>[[tempoh]]</w:t></w:r>")
  .join(
    '<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>[[tempoh]]</w:t></w:r>',
  );

const tempohTcOpen = '<w:tcPr><w:tcW w:w="2520" w:type="dxa"/><w:tcBorders>';
const tempohTcFixed = '<w:tcPr><w:tcW w:w="2520" w:type="dxa"/><w:noWrap/><w:tcBorders>';
if (!xml.includes('<w:tcPr><w:tcW w:w="2520" w:type="dxa"/><w:noWrap/>')) {
  xml = xml.split(tempohTcOpen).join(tempohTcFixed);
}

// Pemohon tarikh blank: lebar tetap supaya tab Ketua kekal di lajur kanan.
const narrowTarikhBlank =
  '<w:r w:rsidRPr="00961670"><w:t>:</w:t></w:r><w:r w:rsidR="00DB07BE"><w:t xml:space="preserve">  </w:t></w:r><w:r w:rsidR="00581BFD"><w:t xml:space="preserve"> </w:t></w:r><w:r w:rsidR="00581BFD"><w:tab/></w:r><w:r w:rsidR="00AA03C8"><w:t xml:space="preserve">Tarikh </w:t>';
const wideTarikhBlank =
  '<w:r w:rsidRPr="00961670"><w:t>:</w:t></w:r><w:r w:rsidR="00DB07BE"><w:t xml:space="preserve">            </w:t></w:r><w:r w:rsidR="00581BFD"><w:t xml:space="preserve"> </w:t></w:r><w:r w:rsidR="00581BFD"><w:tab/></w:r><w:r w:rsidR="00AA03C8"><w:t xml:space="preserve">Tarikh </w:t>';
if (xml.includes(narrowTarikhBlank)) {
  xml = xml.split(narrowTarikhBlank).join(wideTarikhBlank);
}

zip.file("word/document.xml", xml);

mkdirSync(join(root, "public", "templates"), { recursive: true });
writeFileSync(dest, zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));
console.log("OK →", dest);
