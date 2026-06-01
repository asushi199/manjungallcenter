import assert from "node:assert/strict";
import test from "node:test";
import { parseLocalInput } from "../lib/dates";
import {
  computeRoomSlotsForRange,
  resolveBookableRoomCode,
  summarizeRoomConflicts,
} from "../lib/sync-room-bookings";

function local(value: string): Date {
  const parsed = parseLocalInput(value);
  assert.ok(parsed);
  return parsed;
}

test("resolveBookableRoomCode matches supported room names flexibly", () => {
  assert.equal(resolveBookableRoomCode("Mesyuarat Bilik Budiman"), "BILIK_BUDIMAN");
  assert.equal(resolveBookableRoomCode("Program di Dewan Bestari"), "DEWAN_BESTARI");
  assert.equal(resolveBookableRoomCode("Sekolah Kebangsaan Seri Manjung"), null);
});

test("computeRoomSlotsForRange returns AM, PM, or both by time overlap", () => {
  assert.deepEqual(
    computeRoomSlotsForRange(local("2026-06-14T08:30"), local("2026-06-14T11:30")),
    [{ tarikh: "2026-06-14", slot: "AM" }],
  );

  assert.deepEqual(
    computeRoomSlotsForRange(local("2026-06-14T13:30"), local("2026-06-14T16:00")),
    [{ tarikh: "2026-06-14", slot: "PM" }],
  );

  assert.deepEqual(
    computeRoomSlotsForRange(local("2026-06-14T12:30"), local("2026-06-14T13:30")),
    [
      { tarikh: "2026-06-14", slot: "AM" },
      { tarikh: "2026-06-14", slot: "PM" },
    ],
  );
});

test("computeRoomSlotsForRange fullDay books AM and PM for every date", () => {
  assert.deepEqual(
    computeRoomSlotsForRange(local("2026-06-14T08:00"), local("2026-06-15T17:00"), {
      fullDay: true,
    }),
    [
      { tarikh: "2026-06-14", slot: "AM" },
      { tarikh: "2026-06-14", slot: "PM" },
      { tarikh: "2026-06-15", slot: "AM" },
      { tarikh: "2026-06-15", slot: "PM" },
    ],
  );
});

test("summarizeRoomConflicts groups both slots as a full-day conflict", () => {
  assert.deepEqual(
    summarizeRoomConflicts(
      [
        { tarikh: "2026-06-14", slot: "AM", title: "A" },
        { tarikh: "2026-06-14", slot: "PM", title: "B" },
      ],
      "Bilik Budiman",
    ),
    ["14-06-2026: sepanjang hari penuh (Bilik Budiman — Pagi & Petang sudah ditempah)"],
  );
});
