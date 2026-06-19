import assert from "node:assert/strict";
import test from "node:test";
import {
  OPR_IMAGE_JPEG_QUALITY,
  OPR_IMAGE_MAX_EDGE_PX,
  OPR_IMAGE_SKIP_COMPRESS_BELOW_BYTES,
  OPR_IMAGE_TARGET_MAX_BYTES,
  OPR_MAX_PHOTOS,
  buildOprPhotoNaming,
} from "../lib/opr-photos";

test("OPR photo limits stay aligned with the documented policy", () => {
  assert.equal(OPR_MAX_PHOTOS, 4);
  assert.equal(OPR_IMAGE_MAX_EDGE_PX, 1920);
  assert.equal(OPR_IMAGE_JPEG_QUALITY, 0.82);
  assert.equal(OPR_IMAGE_TARGET_MAX_BYTES, 1_200_000);
  assert.equal(OPR_IMAGE_SKIP_COMPRESS_BELOW_BYTES, 450_000);
});

test("buildOprPhotoNaming groups by Year/Month/Sektor and self-describes the file", () => {
  const { fileName, subPath } = buildOprPhotoNaming(
    {
      oprId: 30,
      tarikh: new Date("2026-06-19T08:00:00"),
      sektorCode: "USTP",
      program: "Siasatan SISPA",
      index: 2,
    },
    "photo.JPG",
  );

  assert.deepEqual(subPath, ["2026", "2026-06", "USTP"]);
  assert.match(fileName, /^2026-06-19_USTP_OPR30_SIASATAN-SISPA_2_[a-z0-9]+\.jpg$/);
});

test("buildOprPhotoNaming tolerates missing/invalid metadata", () => {
  const { fileName, subPath } = buildOprPhotoNaming(
    { oprId: 1, tarikh: "not-a-date", sektorCode: "", program: "" },
    "noext",
  );
  assert.equal(subPath.length, 3); // year/month/sektor (sektor -> "NA")
  assert.match(fileName, /_NA_OPR1_NA_[a-z0-9]+\.jpg$/);
});
