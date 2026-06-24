import assert from "node:assert/strict";
import test from "node:test";
import { parseLocalInput } from "../lib/dates";
import {
  buildRoomBookingInsertRows,
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

test("summarizeRoomConflicts names the occupying activities for both slots", () => {
  assert.deepEqual(
    summarizeRoomConflicts(
      [
        { tarikh: "2026-06-14", slot: "AM", title: "A" },
        { tarikh: "2026-06-14", slot: "PM", title: "B" },
      ],
      "Bilik Budiman",
    ),
    ['14-06-2026: Pagi "A" & Petang "B" sudah ditempah (Bilik Budiman)'],
  );
});

test("summarizeRoomConflicts collapses a single full-day activity and names it", () => {
  assert.deepEqual(
    summarizeRoomConflicts(
      [
        { tarikh: "2026-06-14", slot: "AM", title: "Mesyuarat X" },
        { tarikh: "2026-06-14", slot: "PM", title: "Mesyuarat X" },
      ],
      "Dewan Bestari",
    ),
    ['14-06-2026: "Mesyuarat X" sudah menempah sepanjang hari (Dewan Bestari — Pagi & Petang)'],
  );
});

test("summarizeRoomConflicts reports a single occupied slot with its activity", () => {
  assert.deepEqual(
    summarizeRoomConflicts(
      [{ tarikh: "2026-06-14", slot: "PM", title: "Taklimat" }],
      "Dewan Bestari",
    ),
    ['14-06-2026: Petang sudah ditempah — "Taklimat" (Dewan Bestari)'],
  );
});

test("buildRoomBookingInsertRows can link bookings to a takwim activity without pergerakan", () => {
  const rows = buildRoomBookingInsertRows({
    roomId: 3,
    slots: [{ tarikh: "2026-06-14", slot: "AM" }],
    userId: 9,
    title: "Mesyuarat rancangan",
    pergerakanId: null,
    takwimAktivitiId: 22,
  });

  assert.deepEqual(rows, [
    {
      roomId: 3,
      tarikh: "2026-06-14",
      slot: "AM",
      userId: 9,
      pergerakanId: null,
      takwimAktivitiId: 22,
      title: "Mesyuarat Rancangan",
      status: "BOOKED",
    },
  ]);
});
