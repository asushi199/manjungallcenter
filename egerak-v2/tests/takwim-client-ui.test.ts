import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const takwimClientSource = readFileSync("app/(app)/takwim/TakwimClient.tsx", "utf8");

test("expanded takwim rows include the full activity text in a mobile-friendly details panel", () => {
  assert.match(takwimClientSource, /Aktiviti:/);
  assert.match(takwimClientSource, /pl-4 sm:pl-\[5\.9rem\]/);
});
