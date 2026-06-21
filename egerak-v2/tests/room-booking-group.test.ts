import assert from "node:assert/strict";
import test from "node:test";
import { groupMyBookings, type MyBookingRow } from "../lib/room-booking-group";

function row(over: Partial<MyBookingRow>): MyBookingRow {
  return {
    id: 1,
    roomId: 1,
    roomName: "Bilik Budiman",
    roomCode: "BILIK_BUDIMAN",
    tarikh: "2026-06-25",
    slot: "AM",
    title: "Mesyuarat",
    pegawaiNama: "Ali",
    createdAt: "2026-06-21T08:00:00.000Z",
    pendingType: null,
    ...over,
  };
}

test("AM+PM same room/date/title collapse into one full-day item", () => {
  const items = groupMyBookings([
    row({ id: 1, slot: "AM", createdAt: "2026-06-21T08:00:00.000Z" }),
    row({ id: 2, slot: "PM", createdAt: "2026-06-21T08:00:01.000Z" }),
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0]!.fullDay, true);
  assert.equal(items[0]!.slot, "FULL");
  assert.deepEqual(items[0]!.ids, [1, 2]);
  // createdAt = earliest of the pair
  assert.equal(items[0]!.createdAt, "2026-06-21T08:00:00.000Z");
});

test("different titles stay as separate single items", () => {
  const items = groupMyBookings([
    row({ id: 1, slot: "AM", title: "Mesyuarat A" }),
    row({ id: 2, slot: "PM", title: "Mesyuarat B" }),
  ]);
  assert.equal(items.length, 2);
  assert.ok(items.every((i) => !i.fullDay));
});

test("single slot stays single", () => {
  const items = groupMyBookings([row({ id: 9, slot: "PM" })]);
  assert.equal(items.length, 1);
  assert.equal(items[0]!.fullDay, false);
  assert.deepEqual(items[0]!.ids, [9]);
  assert.equal(items[0]!.slot, "PM");
});

test("pendingType on either slot propagates to the full-day item", () => {
  const items = groupMyBookings([
    row({ id: 1, slot: "AM", pendingType: null }),
    row({ id: 2, slot: "PM", pendingType: "MODIFY" }),
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0]!.pendingType, "MODIFY");
});

test("full-day pairs in different rooms are not merged", () => {
  const items = groupMyBookings([
    row({ id: 1, roomId: 1, slot: "AM" }),
    row({ id: 2, roomId: 2, slot: "PM" }),
  ]);
  assert.equal(items.length, 2);
  assert.ok(items.every((i) => !i.fullDay));
});
