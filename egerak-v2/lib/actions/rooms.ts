"use server";

import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { rooms, roomBookings, auditLog, users } from "@/lib/schema";
import { requireUser, requireAdmin } from "@/lib/rbac";

const bookSchema = z.object({
  roomId: z.number().int().positive(),
  tarikh: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(["AM", "PM"]),
  title: z.string().min(1, "Tajuk aktiviti diperlukan").max(200),
  pergerakanId: z.number().int().positive().optional().nullable(),
});

export type BookResult = { ok: true; id: number } | { ok: false; error: string };

export async function listRooms() {
  return db.select().from(rooms).orderBy(asc(rooms.name));
}

export async function listBookingsInRange(start: string, end: string) {
  await requireUser();
  return db
    .select({
      id: roomBookings.id,
      roomId: roomBookings.roomId,
      roomCode: rooms.code,
      roomName: rooms.name,
      tarikh: roomBookings.tarikh,
      slot: roomBookings.slot,
      title: roomBookings.title,
      userId: roomBookings.userId,
      pegawaiNama: users.nama,
      status: roomBookings.status,
    })
    .from(roomBookings)
    .innerJoin(rooms, eq(rooms.id, roomBookings.roomId))
    .innerJoin(users, eq(users.id, roomBookings.userId))
    .where(
      and(
        eq(roomBookings.status, "BOOKED"),
        gte(roomBookings.tarikh, start),
        lte(roomBookings.tarikh, end),
      ),
    );
}

export async function bookRoom(input: unknown): Promise<BookResult> {
  const user = await requireUser();
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah" };
  }
  const { roomId, tarikh, slot, title, pergerakanId } = parsed.data;

  const conflict = await db.query.roomBookings.findFirst({
    where: and(
      eq(roomBookings.roomId, roomId),
      eq(roomBookings.tarikh, tarikh),
      eq(roomBookings.slot, slot),
      eq(roomBookings.status, "BOOKED"),
    ),
  });
  if (conflict) {
    return { ok: false, error: "Slot ini sudah ditempah. Pilih tarikh atau slot lain." };
  }

  try {
    const [row] = await db
      .insert(roomBookings)
      .values({
        roomId,
        tarikh,
        slot,
        title: title.trim(),
        userId: Number(user.id),
        pergerakanId: pergerakanId ?? null,
        status: "BOOKED",
      })
      .returning({ id: roomBookings.id });

    await db.insert(auditLog).values({
      action: "ROOM_BOOK",
      userId: Number(user.id),
      detail: { id: row.id, roomId, tarikh, slot },
    });

    revalidatePath("/bilik");
    revalidatePath("/dashboard");
    return { ok: true, id: row.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { ok: false, error: "Slot ini sudah ditempah." };
    }
    throw e;
  }
}

export async function cancelBooking(bookingId: number): Promise<BookResult> {
  const user = await requireUser();
  const row = await db.query.roomBookings.findFirst({
    where: eq(roomBookings.id, bookingId),
  });
  if (!row) return { ok: false, error: "Tempahan tidak dijumpai" };
  const isAdmin = user.peranan === "Admin";
  if (!isAdmin && row.userId !== Number(user.id)) {
    return { ok: false, error: "Tiada kebenaran" };
  }

  await db
    .update(roomBookings)
    .set({ status: "CANCELLED", updatedAt: new Date() })
    .where(eq(roomBookings.id, bookingId));

  await db.insert(auditLog).values({
    action: "ROOM_CANCEL",
    userId: Number(user.id),
    detail: { bookingId },
  });

  revalidatePath("/bilik");
  return { ok: true, id: bookingId };
}

export async function cancelBookingsBulk(
  ids: number[],
): Promise<{ cancelled: number; error?: string }> {
  const user = await requireUser();
  if (user.peranan !== "Admin") {
    return { cancelled: 0, error: "Hanya pentadbir" };
  }
  if (!ids?.length) return { cancelled: 0 };

  const rows = await db
    .select({ id: roomBookings.id })
    .from(roomBookings)
    .where(and(inArray(roomBookings.id, ids), eq(roomBookings.status, "BOOKED")));

  const allowed = rows.map((r) => r.id);
  if (!allowed.length) return { cancelled: 0 };

  await db
    .update(roomBookings)
    .set({ status: "CANCELLED", updatedAt: new Date() })
    .where(inArray(roomBookings.id, allowed));

  await db.insert(auditLog).values({
    action: "ROOM_CANCEL_BULK",
    userId: Number(user.id),
    detail: { ids: allowed },
  });

  revalidatePath("/bilik");
  revalidatePath("/dashboard");
  return { cancelled: allowed.length };
}

export async function listMyBookings() {
  const user = await requireUser();
  return db
    .select({
      id: roomBookings.id,
      roomName: rooms.name,
      roomCode: rooms.code,
      tarikh: roomBookings.tarikh,
      slot: roomBookings.slot,
      title: roomBookings.title,
      pegawaiNama: users.nama,
    })
    .from(roomBookings)
    .innerJoin(rooms, eq(rooms.id, roomBookings.roomId))
    .innerJoin(users, eq(users.id, roomBookings.userId))
    .where(and(eq(roomBookings.userId, Number(user.id)), eq(roomBookings.status, "BOOKED")))
    .orderBy(desc(roomBookings.tarikh));
}
