import assert from "node:assert/strict";
import test from "node:test";
import { parseLocalInput } from "../lib/dates";
import { slotsOnDay, attendanceKind } from "../lib/pergerakan-slot";

function d(s: string): Date {
  const p = parseLocalInput(s);
  assert.ok(p);
  return p;
}

test("morning-only movement occupies AM", () => {
  assert.deepEqual(slotsOnDay(d("2026-06-25T08:30"), d("2026-06-25T11:30"), "2026-06-25"), ["AM"]);
  assert.equal(attendanceKind(d("2026-06-25T08:30"), d("2026-06-25T11:30"), "2026-06-25"), "AM");
});

test("afternoon-only movement occupies PM", () => {
  assert.deepEqual(slotsOnDay(d("2026-06-25T13:30"), d("2026-06-25T16:00"), "2026-06-25"), ["PM"]);
  assert.equal(attendanceKind(d("2026-06-25T13:30"), d("2026-06-25T16:00"), "2026-06-25"), "PM");
});

test("all-day movement occupies both → FULL", () => {
  assert.deepEqual(slotsOnDay(d("2026-06-25T08:00"), d("2026-06-25T17:00"), "2026-06-25"), ["AM", "PM"]);
  assert.equal(attendanceKind(d("2026-06-25T08:00"), d("2026-06-25T17:00"), "2026-06-25"), "FULL");
});

test("other day → NONE", () => {
  assert.deepEqual(slotsOnDay(d("2026-06-25T08:30"), d("2026-06-25T11:30"), "2026-06-26"), []);
  assert.equal(attendanceKind(d("2026-06-25T08:30"), d("2026-06-25T11:30"), "2026-06-26"), "NONE");
});

test("movement ending exactly at PM boundary (13:00) occupies both", () => {
  assert.equal(attendanceKind(d("2026-06-25T08:00"), d("2026-06-25T13:00"), "2026-06-25"), "FULL");
});

test("movement starting exactly at PM boundary (13:00) occupies only PM", () => {
  assert.equal(attendanceKind(d("2026-06-25T13:00"), d("2026-06-25T16:00"), "2026-06-25"), "PM");
});
