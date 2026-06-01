import assert from "node:assert/strict";
import test from "node:test";
import {
  OPR_IMAGE_JPEG_QUALITY,
  OPR_IMAGE_MAX_EDGE_PX,
  OPR_IMAGE_SKIP_COMPRESS_BELOW_BYTES,
  OPR_IMAGE_TARGET_MAX_BYTES,
  OPR_MAX_PHOTOS,
} from "../lib/opr-photos";

test("OPR photo limits stay aligned with the documented policy", () => {
  assert.equal(OPR_MAX_PHOTOS, 4);
  assert.equal(OPR_IMAGE_MAX_EDGE_PX, 1920);
  assert.equal(OPR_IMAGE_JPEG_QUALITY, 0.82);
  assert.equal(OPR_IMAGE_TARGET_MAX_BYTES, 1_200_000);
  assert.equal(OPR_IMAGE_SKIP_COMPRESS_BELOW_BYTES, 450_000);
});
