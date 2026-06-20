import assert from "node:assert/strict";
import test from "node:test";
import manifest from "@/app/manifest";
import {
  APP_DISPLAY_NAME,
  APP_SHORT_NAME,
  BRAND_THEME_COLOR,
  PWA_APP_NAME,
} from "@/lib/branding";

test("branding keeps the visible app name separate from the installed PWA name", () => {
  const pwaManifest = manifest();

  assert.equal(APP_DISPLAY_NAME, "SentRa PPD Manjung");
  assert.equal(APP_SHORT_NAME, "SentRa");
  assert.equal(PWA_APP_NAME, "Manjung Hebat");
  assert.equal(BRAND_THEME_COLOR, "#0646a3");
  assert.equal(pwaManifest.name, PWA_APP_NAME);
  assert.equal(pwaManifest.short_name, PWA_APP_NAME);
  assert.equal(pwaManifest.theme_color, BRAND_THEME_COLOR);
});
