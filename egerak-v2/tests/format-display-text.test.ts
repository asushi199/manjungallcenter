import assert from "node:assert/strict";
import test from "node:test";
import { formatTitleCase } from "../lib/format-display-text";

test("all-caps words become Title Case but known short forms stay uppercase", () => {
  assert.equal(formatTitleCase("PEGAWAI USTP"), "Pegawai USTP");
  assert.equal(formatTitleCase("SIASATAN SISPA"), "Siasatan SISPA");
  assert.equal(formatTitleCase("SK PANGKALAN BAHARU"), "SK Pangkalan Baharu");
  assert.equal(formatTitleCase("GURU TERLIBAT"), "Guru Terlibat");
});

test("connector words stay lowercase except at the start", () => {
  assert.equal(
    formatTitleCase("UNIT SUMBER TEKNOLOGI PENDIDIKAN"),
    "Unit Sumber Teknologi Pendidikan",
  );
  assert.equal(formatTitleCase("bengkel ICT untuk guru"), "Bengkel ICT untuk Guru");
});

test("already-formatted input is left stable (idempotent)", () => {
  assert.equal(formatTitleCase("Pegawai USTP"), "Pegawai USTP");
  assert.equal(formatTitleCase("SK Pangkalan Baharu"), "SK Pangkalan Baharu");
});

test("alphanumeric codes and canonical brands keep their casing", () => {
  assert.equal(formatTitleCase("program PAK21"), "Program PAK21");
  assert.equal(formatTitleCase("kelas PT3"), "Kelas PT3");
  assert.equal(formatTitleCase("modul DELIMA"), "Modul DELIMa");
});
