"use server";

import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { rooms, roomBookings, auditLog, users } from "@/lib/schema";
import { requireUser, requireAdmin } from "@/lib/rbac";
import { formatTitleCase } from "@/lib/format-display-text";

const bookSchema = z
  .object({
    roomId: z.number().int().positive(),
    tarikh: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    slot: z.enum(["AM", "PM"]).optional(),
    fullDay: z.boolean().optional(),
    title: z.string().min(1, "Tajuk aktiviti diperlukan").max(200),
    pergerakanId: z.number().int().positive().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.fullDay && !data.slot) {
      ctx.addIssue({ code: "custom", message: "Pilih slot", path: ["slot"] });
    }
  });

export type BookResult =
  | { ok: true; id: number; slotsBooked?: 1 | 2 }
  | { ok: false; error: string };

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

const SLOT_BM: Record<"AM" | "PM", string> = { AM: "Pagi", PM: "Petang" };

export async function bookRoom(input: unknown): Promise<BookResult> {
  const user = await requireUser();
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah" };
  }
  const { roomId, tarikh, pergerakanId, fullDay } = parsed.data;
  const trimmedTitle = formatTitleCase(parsed.data.title).slice(0, 200);
  const userId = Number(user.id);
  const slots: Array<"AM" | "PM"> = fullDay ? ["AM", "PM"] : [parsed.data.slot!];

  const existing = await db
    .select({ slot: roomBookings.slot })
    .from(roomBookings)
    .where(
      and(
        eq(roomBookings.roomId, roomId),
        eq(roomBookings.tarikh, tarikh),
        eq(roomBookings.status, "BOOKED"),
        inArray(roomBookings.slot, slots),
      ),
    );
  if (existing.length > 0) {
    const taken = [...new Set(existing.map((r) => SLOT_BM[r.slot]))].join(" & ");
    if (fullDay) {
      return {
        ok: false,
        error: `Tidak boleh tempah sepanjang hari — slot ${taken} sudah ditempah.`,
      };
    }
    return { ok: false, error: "Slot ini sudah ditempah. Pilih tarikh atau slot lain." };
  }

  try {
    const rows = await db.transaction(async (tx) => {
      const inserted: { id: number }[] = [];
      for (const slot of slots) {
        const [row] = await tx
          .insert(roomBookings)
          .values({
            roomId,
            tarikh,
            slot,
            title: trimmedTitle,
            userId,
            pergerakanId: pergerakanId ?? null,
            status: "BOOKED",
          })
          .returning({ id: roomBookings.id });
        inserted.push(row);
      }
      for (let i = 0; i < inserted.length; i++) {
        await tx.insert(auditLog).values({
          action: "ROOM_BOOK",
          userId,
          detail: { id: inserted[i]!.id, roomId, tarikh, slot: slots[i] },
        });
      }
      return inserted;
    });

    revalidatePath("/bilik");
    revalidatePath("/dashboard");
    return {
      ok: true,
      id: rows[0]!.id,
      slotsBooked: fullDay ? 2 : 1,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return {
        ok: false,
        error: fullDay
          ? "Slot Pagi atau Petang sudah ditempah."
          : "Slot ini sudah ditempah.",
      };
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
