import assert from "node:assert/strict";
import test from "node:test";
import { formatDateTime, overlapsDate, parseLocalInput, toLocalInput, ymd } from "../lib/dates";

test("parseLocalInput treats datetime-local values as Kuala Lumpur wall-clock time", () => {
  const parsed = parseLocalInput("2026-06-14T08:30");

  assert.ok(parsed);
  assert.equal(parsed.toISOString(), "2026-06-14T00:30:00.000Z");
  assert.equal(toLocalInput(parsed), "2026-06-14T08:30");
  assert.equal(formatDateTime(parsed), "14-06-2026 08:30");
});

test("ymd formats UTC instants in Asia/Kuala_Lumpur", () => {
  assert.equal(ymd(new Date("2026-06-13T16:30:00.000Z")), "2026-06-14");
});

test("overlapsDate detects pergerakan ranges that cross a local day", () => {
  const start = parseLocalInput("2026-06-14T16:30");
  const end = parseLocalInput("2026-06-15T09:00");

  assert.ok(start);
  assert.ok(end);
  assert.equal(overlapsDate(start, end, new Date("2026-06-14T12:00:00+08:00")), true);
  assert.equal(overlapsDate(start, end, new Date("2026-06-15T12:00:00+08:00")), true);
  assert.equal(overlapsDate(start, end, new Date("2026-06-16T12:00:00+08:00")), false);
});
