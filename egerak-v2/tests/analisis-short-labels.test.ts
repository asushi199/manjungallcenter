import assert from "node:assert/strict";
import test from "node:test";
import { fokusShortLabel, sektorShortLabel } from "../lib/analisis-short-labels";

test("sektorShortLabel returns compact sektor codes for mobile stacked bars", () => {
  assert.equal(sektorShortLabel("PERANCANGAN", "Sektor Perancangan"), "SPr");
  assert.equal(sektorShortLabel("PENGURUSAN_SEKOLAH", "Sektor Pengurusan Sekolah"), "SPS");
  assert.equal(sektorShortLabel("PEMBANGUNAN_MURID", "Sektor Pembangunan Murid"), "SPM");
  assert.equal(sektorShortLabel("PENTAKSIRAN", "Sektor Pentaksiran dan Peperiksaan"), "SPP");
  assert.equal(sektorShortLabel("PSIKOLOGI_KAUNSELING", "Sektor Psikologi dan Kaunseling"), "SPsK");
  assert.equal(sektorShortLabel("PENGURUSAN", "Sektor Pengurusan"), "SPg");
  assert.equal(sektorShortLabel("USTP", "Unit Sumber Teknologi Pendidikan (USTP)"), "USTP");
  assert.equal(sektorShortLabel("PEMBELAJARAN", "Sektor Pembelajaran"), "SPb");
  assert.equal(sektorShortLabel("PPD_PENTADBIRAN", "Pegawai PPD"), "PPD");
});

test("sektorShortLabel falls back to a readable compact label", () => {
  assert.equal(sektorShortLabel("CUSTOM", "Unit Khas Pendidikan"), "UKP");
  assert.equal(sektorShortLabel(null, "Sektor Baharu"), "SB");
  assert.equal(sektorShortLabel(null, ""), "-");
});

test("fokusShortLabel returns compact fokus codes for the sektor-focus block only", () => {
  assert.equal(fokusShortLabel("Aduan/Siasatan"), "AS");
  assert.equal(fokusShortLabel("Runding Cara/Konsultansi"), "RCK");
  assert.equal(fokusShortLabel("Bimbingan"), "BIM");
  assert.equal(fokusShortLabel("Program Sokongan"), "PS");
  assert.equal(fokusShortLabel("Perasmian"), "RAS");
  assert.equal(fokusShortLabel("Pemantauan"), "PMT");
});

test("fokusShortLabel falls back to initials for unexpected fokus values", () => {
  assert.equal(fokusShortLabel("Lain-lain"), "L");
  assert.equal(fokusShortLabel(""), "-");
});
