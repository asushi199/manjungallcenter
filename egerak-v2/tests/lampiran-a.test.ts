import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fromZonedTime } from "date-fns-tz";
import { TZ } from "../lib/dates";
import {
  buildLampiranAFields,
  formatLampiranTempoh,
  lampiranADownloadFilename,
} from "../lib/lampiran-a";

describe("formatLampiranTempoh", () => {
  it("same day shows single date", () => {
    const d = fromZonedTime("2026-05-21T07:00:00", TZ);
    assert.equal(formatLampiranTempoh(d, d), "21/05/2026");
  });

  it("range shows both dates", () => {
    const pergi = fromZonedTime("2026-05-21T07:00:00", TZ);
    const kembali = fromZonedTime("2026-05-22T17:00:00", TZ);
    assert.equal(formatLampiranTempoh(pergi, kembali), "21–22/05/2026");
  });

  it("cross-month range stacks dates", () => {
    const pergi = fromZonedTime("2026-05-30T07:00:00", TZ);
    const kembali = fromZonedTime("2026-06-02T17:00:00", TZ);
    assert.equal(formatLampiranTempoh(pergi, kembali), "30/05/2026\n02/06/2026");
  });
});

describe("buildLampiranAFields", () => {
  it("maps profile and pergerakan fields", () => {
    const pergi = fromZonedTime("2026-05-21T07:00:00", TZ);
    const kembali = fromZonedTime("2026-05-21T12:30:00", TZ);
    const fields = buildLampiranAFields({
      nama: "ong chong xiao",
      jawatan: "penolong ppd ustp",
      sektorName: "Sektor Pembelajaran",
      lokasi: "padang smk dato idris",
      urusan: "program olahraga",
      tarikhPergi: pergi,
      tarikhKembali: kembali,
    });
    assert.equal(fields.nama, "Ong Chong Xiao");
    assert.equal(fields.bahagian, "Sektor Pembelajaran, PPD Manjung");
    assert.equal(fields.tempoh, "21/05/2026");
  });
});

describe("lampiranADownloadFilename", () => {
  it("sanitizes urusan for filename", () => {
    const name = lampiranADownloadFilename(9, "Mcp / Pertandingan Nyanyian!!!");
    assert.match(name, /^Lampiran-A_/);
    assert.ok(name.endsWith(".docx"));
    assert.ok(!name.includes("/"));
  });
});
