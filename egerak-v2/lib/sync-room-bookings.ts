import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { and, eq, inArray, or, isNull, ne } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { TZ, ymd } from "@/lib/dates";
import { SLOT_LABEL, formatTarikhBm } from "@/lib/room-slots";
import { roomBookings, rooms, auditLog } from "@/lib/schema";
import type * as schema from "@/lib/schema";
import { formatTitleCase } from "@/lib/format-display-text";

type Db = PostgresJsDatabase<typeof schema>;

/** Lokasi yang memicu tempahan automatik (padanan fleksibel). */
export function resolveBookableRoomCode(lokasi: string): "BILIK_BUDIMAN" | "DEWAN_BESTARI" | null {
  const s = lokasi.trim().toLowerCase();
  if (s.includes("budiman")) return "BILIK_BUDIMAN";
  if (s.includes("bestari")) return "DEWAN_BESTARI";
  return null;
}

function intervalsOverlap(s1: Date, e1: Date, s2: Date, e2: Date): boolean {
  return s1.getTime() <= e2.getTime() && e1.getTime() >= s2.getTime();
}

function eachYmdBetween(pergi: Date, kembali: Date): string[] {
  let cur = ymd(pergi);
  const end = ymd(kembali);
  const out: string[] = [];
  let guard = 0;
  while (cur <= end && guard < 400) {
    out.push(cur);
    const next = formatInTimeZone(
      addDays(fromZonedTime(`${cur}T12:00:00`, TZ), 1),
      TZ,
      "yyyy-MM-dd",
    );
    if (next <= cur) break;
    cur = next;
    guard++;
  }
  return out;
}

export type RoomSlot = { tarikh: string; slot: "AM" | "PM" };

/** Kira slot AM/PM. `fullDay` = setiap hari dalam julat ambil AM+PM (aktiviti sepanjang hari). */
export function computeRoomSlotsForRange(
  pergi: Date,
  kembali: Date,
  options?: { fullDay?: boolean },
): RoomSlot[] {
  const out: RoomSlot[] = [];
  for (const tarikh of eachYmdBetween(pergi, kembali)) {
    if (options?.fullDay) {
      out.push({ tarikh, slot: "AM" }, { tarikh, slot: "PM" });
      continue;
    }
    const amStart = fromZonedTime(`${tarikh}T08:00:00`, TZ);
    const amEnd = fromZonedTime(`${tarikh}T12:59:59`, TZ);
    const pmStart = fromZonedTime(`${tarikh}T13:00:00`, TZ);
    const pmEnd = fromZonedTime(`${tarikh}T17:00:00`, TZ);
    if (intervalsOverlap(pergi, kembali, amStart, amEnd)) {
      out.push({ tarikh, slot: "AM" });
    }
    if (intervalsOverlap(pergi, kembali, pmStart, pmEnd)) {
      out.push({ tarikh, slot: "PM" });
    }
  }
  return out;
}

export type RoomConflictDetail = {
  tarikh: string;
  slot: "AM" | "PM";
  title: string;
};

export type RoomBookingPreview = {
  applies: boolean;
  roomName?: string;
  neededSlots: RoomSlot[];
  conflicts: RoomConflictDetail[];
  /** Tarikh yang kedua-dua AM & PM bertembung / diperlukan penuh tetapi sudah penuh */
  fullDayBlockedDates: string[];
  canBook: boolean;
  summary: string | null;
};

/** Kumpulkan konflik untuk paparan: hari penuh vs slot tunggal */
export function summarizeRoomConflicts(
  conflicts: RoomConflictDetail[],
  roomName: string,
): string[] {
  const byDate = new Map<string, Set<"AM" | "PM">>();
  for (const c of conflicts) {
    const set = byDate.get(c.tarikh) ?? new Set();
    set.add(c.slot);
    byDate.set(c.tarikh, set);
  }
  const lines: string[] = [];
  for (const [tarikh, slots] of [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const d = formatTarikhBm(tarikh);
    if (slots.has("AM") && slots.has("PM")) {
      lines.push(`${d}: sepanjang hari penuh (${roomName} — Pagi & Petang sudah ditempah)`);
    } else {
      const label = slots.has("AM") ? "Pagi" : "Petang";
      lines.push(`${d}: ${label} sudah ditempah`);
    }
  }
  return lines;
}

export async function previewRoomBookingsForPergerakan(
  db: Db,
  input: {
    roomCode: "BILIK_BUDIMAN" | "DEWAN_BESTARI";
    pergi: Date;
    kembali: Date;
    fullDay?: boolean;
    /** Semasa edit: abaikan tempahan sedia ada untuk pergerakan ini */
    excludePergerakanId?: number;
  },
): Promise<RoomBookingPreview> {
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.code, input.roomCode),
  });
  if (!room) {
    return {
      applies: true,
      roomName: input.roomCode,
      neededSlots: [],
      conflicts: [],
      fullDayBlockedDates: [],
      canBook: false,
      summary: "Bilik/dewan tidak dijumpai dalam sistem.",
    };
  }

  const neededSlots = computeRoomSlotsForRange(input.pergi, input.kembali, {
    fullDay: input.fullDay,
  });

  if (!neededSlots.length) {
    return {
      applies: true,
      roomName: room.name,
      neededSlots: [],
      conflicts: [],
      fullDayBlockedDates: [],
      canBook: false,
      summary: `Masa tidak dalam waktu tempahan (${SLOT_LABEL.AM} / ${SLOT_LABEL.PM}). Pilih 8 pagi–5 petang atau tandakan aktiviti sepanjang hari.`,
    };
  }

  const conflictConditions = [
    eq(roomBookings.roomId, room.id),
    eq(roomBookings.status, "BOOKED"),
    or(
      ...neededSlots.map((s) =>
        and(eq(roomBookings.tarikh, s.tarikh), eq(roomBookings.slot, s.slot)),
      ),
    ),
  ];
  if (input.excludePergerakanId != null) {
    conflictConditions.push(
      or(
        isNull(roomBookings.pergerakanId),
        ne(roomBookings.pergerakanId, input.excludePergerakanId),
      ),
    );
  }

  const conflictRows = await db
    .select({
      tarikh: roomBookings.tarikh,
      slot: roomBookings.slot,
      title: roomBookings.title,
    })
    .from(roomBookings)
    .where(and(...conflictConditions));

  const conflicts: RoomConflictDetail[] = conflictRows.map((c) => ({
    tarikh: String(c.tarikh),
    slot: c.slot,
    title: c.title,
  }));

  const conflictSet = new Set(conflicts.map((c) => `${c.tarikh}:${c.slot}`));
  const fullDayBlockedDates: string[] = [];
  for (const tarikh of eachYmdBetween(input.pergi, input.kembali)) {
    const needAm = neededSlots.some((s) => s.tarikh === tarikh && s.slot === "AM");
    const needPm = neededSlots.some((s) => s.tarikh === tarikh && s.slot === "PM");
    const blockAm = needAm && conflictSet.has(`${tarikh}:AM`);
    const blockPm = needPm && conflictSet.has(`${tarikh}:PM`);
    if (blockAm && blockPm) fullDayBlockedDates.push(tarikh);
  }

  const lines = summarizeRoomConflicts(conflicts, room.name);
  const canBook = conflicts.length === 0;

  return {
    applies: true,
    roomName: room.name,
    neededSlots,
    conflicts,
    fullDayBlockedDates,
    canBook,
    summary: canBook
      ? null
      : lines.length
        ? `Slot bertembung — ${lines.join("; ")}.`
        : `Tempahan gagal — ${room.name}.`,
  };
}

export type SyncRoomResult = { ok: true; count: number } | { ok: false; error: string };

export function buildRoomBookingInsertRows(input: {
  roomId: number;
  slots: RoomSlot[];
  userId: number;
  title: string;
  pergerakanId: number | null;
  takwimAktivitiId?: number | null;
}) {
  return input.slots.map((s) => ({
    roomId: input.roomId,
    tarikh: s.tarikh,
    slot: s.slot,
    userId: input.userId,
    pergerakanId: input.pergerakanId,
    takwimAktivitiId: input.takwimAktivitiId ?? null,
    title: formatTitleCase(input.title).slice(0, 200),
    status: "BOOKED" as const,
  }));
}

/** Cipta tempahan bilik/dewan berkaitan pergerakan; gagal jika slot bertembung. */
export async function syncRoomBookingsFromPergerakan(
  tx: Db,
  input: {
    pergerakanId: number;
    takwimAktivitiId?: number | null;
    roomCode: "BILIK_BUDIMAN" | "DEWAN_BESTARI";
    userId: number;
    title: string;
    pergi: Date;
    kembali: Date;
    fullDay?: boolean;
    auditUserId: number;
  },
): Promise<SyncRoomResult> {
  const room = await tx.query.rooms.findFirst({
    where: eq(rooms.code, input.roomCode),
  });
  if (!room) {
    return {
      ok: false,
      error: "Bilik/dewan tidak dijumpai dalam sistem. Jalankan npm run db:seed.",
    };
  }

  const preview = await previewRoomBookingsForPergerakan(tx, {
    roomCode: input.roomCode,
    pergi: input.pergi,
    kembali: input.kembali,
    fullDay: input.fullDay,
  });

  if (!preview.canBook) {
    return {
      ok: false,
      error: preview.summary ?? `Tempahan gagal — ${room.name}.`,
    };
  }

  const slots = preview.neededSlots;

  await tx.insert(roomBookings).values(
    buildRoomBookingInsertRows({
      roomId: room.id,
      slots,
      userId: input.userId,
      pergerakanId: input.pergerakanId,
      takwimAktivitiId: input.takwimAktivitiId ?? null,
      title: input.title,
    }),
  );

  await tx.insert(auditLog).values({
    action: "ROOM_BOOK_FROM_PERGERAKAN",
    userId: input.auditUserId,
    detail: {
      pergerakanId: input.pergerakanId,
      takwimAktivitiId: input.takwimAktivitiId ?? null,
      roomCode: input.roomCode,
      slots,
    },
  });

  return { ok: true, count: slots.length };
}

/** Cipta tempahan bilik/dewan berkaitan aktiviti Takwim tanpa perlu pergerakan pegawai. */
export async function syncRoomBookingsFromTakwimAktiviti(
  tx: Db,
  input: {
    takwimAktivitiId: number;
    roomCode: "BILIK_BUDIMAN" | "DEWAN_BESTARI";
    userId: number;
    title: string;
    pergi: Date;
    kembali: Date;
    fullDay?: boolean;
    auditUserId: number;
  },
): Promise<SyncRoomResult> {
  const room = await tx.query.rooms.findFirst({
    where: eq(rooms.code, input.roomCode),
  });
  if (!room) {
    return {
      ok: false,
      error: "Bilik/dewan tidak dijumpai dalam sistem. Jalankan npm run db:seed.",
    };
  }

  const preview = await previewRoomBookingsForPergerakan(tx, {
    roomCode: input.roomCode,
    pergi: input.pergi,
    kembali: input.kembali,
    fullDay: input.fullDay,
  });

  if (!preview.canBook) {
    return {
      ok: false,
      error: preview.summary ?? `Tempahan gagal 鈥?${room.name}.`,
    };
  }

  const slots = preview.neededSlots;
  await tx.insert(roomBookings).values(
    buildRoomBookingInsertRows({
      roomId: room.id,
      slots,
      userId: input.userId,
      pergerakanId: null,
      takwimAktivitiId: input.takwimAktivitiId,
      title: input.title,
    }),
  );

  await tx.insert(auditLog).values({
    action: "ROOM_BOOK_FROM_TAKWIM",
    userId: input.auditUserId,
    detail: {
      takwimAktivitiId: input.takwimAktivitiId,
      roomCode: input.roomCode,
      slots,
    },
  });

  return { ok: true, count: slots.length };
}

export async function cancelRoomBookingsForPergerakan(
  tx: Db,
  pergerakanIds: number[],
  auditUserId: number,
): Promise<number> {
  if (!pergerakanIds.length) return 0;

  const cancelled = await tx
    .update(roomBookings)
    .set({ status: "CANCELLED", updatedAt: new Date() })
    .where(
      and(
        inArray(roomBookings.pergerakanId, pergerakanIds),
        eq(roomBookings.status, "BOOKED"),
      ),
    )
    .returning({ id: roomBookings.id });

  if (cancelled.length) {
    await tx.insert(auditLog).values({
      action: "ROOM_CANCEL_PERGERAKAN",
      userId: auditUserId,
      detail: { pergerakanIds, bookingIds: cancelled.map((c) => c.id) },
    });
  }

  return cancelled.length;
}
