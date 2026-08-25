import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDayLabel,
  formatDayLabelCompact,
  isWeekend,
  weekdayShortBm,
} from "../lib/bilik-month";

test("weekdayShortBm uses 3-letter BM names", () => {
  assert.equal(weekdayShortBm("2026-08-23"), "Aha");
  assert.equal(weekdayShortBm("2026-08-24"), "Isn");
  assert.equal(weekdayShortBm("2026-08-25"), "Sel");
  assert.equal(weekdayShortBm("2026-08-26"), "Rab");
  assert.equal(weekdayShortBm("2026-08-27"), "Kha");
  assert.equal(weekdayShortBm("2026-08-28"), "Jum");
  assert.equal(weekdayShortBm("2026-08-29"), "Sab");
});

test("formatDayLabelCompact keeps date plus short weekday", () => {
  assert.equal(formatDayLabelCompact("2026-08-25"), "25/08 Sel");
});

test("formatDayLabel includes weekday for dialogs", () => {
  assert.equal(formatDayLabel("2026-08-25"), "Sel, 25/08/2026");
});

test("isWeekend flags Saturday and Sunday only", () => {
  assert.equal(isWeekend("2026-08-28"), false);
  assert.equal(isWeekend("2026-08-29"), true);
  assert.equal(isWeekend("2026-08-23"), true);
});
