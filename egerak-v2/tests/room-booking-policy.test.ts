import assert from "node:assert/strict";
import test from "node:test";
import { GRACE_PERIOD_MS, isWithinGrace, graceRemainingMs } from "../lib/room-booking-policy";

const now = new Date("2026-06-21T12:00:00Z");

test("isWithinGrace true just under 24 jam", () => {
  const created = new Date(now.getTime() - (GRACE_PERIOD_MS - 60_000));
  assert.equal(isWithinGrace(created, now), true);
});

test("isWithinGrace false at and beyond 24 jam", () => {
  const exactly = new Date(now.getTime() - GRACE_PERIOD_MS);
  assert.equal(isWithinGrace(exactly, now), false);
  const past = new Date(now.getTime() - (GRACE_PERIOD_MS + 60_000));
  assert.equal(isWithinGrace(past, now), false);
});

test("isWithinGrace accepts ISO string", () => {
  const created = new Date(now.getTime() - 3_600_000).toISOString();
  assert.equal(isWithinGrace(created, now), true);
});

test("graceRemainingMs counts down and floors at zero", () => {
  const created = new Date(now.getTime() - (GRACE_PERIOD_MS - 3_600_000));
  assert.equal(graceRemainingMs(created, now), 3_600_000);
  const expired = new Date(now.getTime() - GRACE_PERIOD_MS * 2);
  assert.equal(graceRemainingMs(expired, now), 0);
});
