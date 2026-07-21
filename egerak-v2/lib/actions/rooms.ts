"use server";

import { and, asc, desc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { rooms, roomBookings, bookingRequests, auditLog, users } from "@/lib/schema";
import { requireUser } from "@/lib/rbac";
import { isWithinGrace } from "@/lib/room-booking-policy";
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

const modifySchema = z
  .object({
    bookingIds: z.array(z.number().int().positive()).min(1).max(2),
    roomId: z.number().int().positive(),
    tarikh: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Slot sasaran. Wajib apabila `fullDay` palsu; diabaikan apabila sepanjang hari. */
    slot: z.enum(["AM", "PM"]).optional(),
    /** Sasaran sepanjang hari (Pagi + Petang). Boleh tukar slot tunggal ↔ sepanjang hari. */
    fullDay: z.boolean().optional(),
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
      takwimAktivitiId: roomBookings.takwimAktivitiId,
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

/** Hasil tindakan batal/ubah: terus berkuat kuasa atau dimohon untuk kelulusan Admin. */
export type ActionResult =
  | { ok: true; mode: "applied" | "requested" }
  | { ok: false; error: string };

/** Adakah slot sasaran sudah ditempah oleh tempahan lain (selain tempahan dalam kumpulan ini)? */
async function slotTaken(
  roomId: number,
  tarikh: string,
  slot: "AM" | "PM",
  excludeIds: number[],
): Promise<boolean> {
  const conflict = await db
    .select({ id: roomBookings.id })
    .from(roomBookings)
    .where(
      and(
        eq(roomBookings.roomId, roomId),
        eq(roomBookings.tarikh, tarikh),
        eq(roomBookings.slot, slot),
        eq(roomBookings.status, "BOOKED"),
      ),
    );
  return conflict.some((r) => !excludeIds.includes(r.id));
}

/** Muat & sahkan satu kumpulan tempahan (1 slot atau sepanjang hari) milik pengguna. */
async function loadGroup(
  ids: number[],
  userId: number,
  isAdmin: boolean,
): Promise<{ ok: true; rows: typeof roomBookings.$inferSelect[] } | { ok: false; error: string }> {
  const rows = await db.select().from(roomBookings).where(inArray(roomBookings.id, ids));
  if (rows.length !== ids.length) return { ok: false, error: "Tempahan tidak dijumpai" };
  if (rows.some((r) => r.status !== "BOOKED")) {
    return { ok: false, error: "Tempahan tidak aktif" };
  }
  if (!isAdmin && rows.some((r) => r.userId !== userId)) {
    return { ok: false, error: "Tiada kebenaran" };
  }
  return { ok: true, rows };
}

/**
 * Batal tempahan (satu slot atau sepanjang hari sekali gus).
 * - Admin atau pemilik dalam 24 jam: batal terus.
 * - Pemilik selepas 24 jam: hantar permohonan batal untuk kelulusan Admin.
 */
export async function cancelBooking(bookingIds: number[]): Promise<ActionResult> {
  const user = await requireUser();
  const userId = Number(user.id);
  const ids = [...new Set(bookingIds)].filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0 || ids.length > 2) return { ok: false, error: "Input tidak sah" };

  const isAdmin = user.peranan === "Admin";
  const loaded = await loadGroup(ids, userId, isAdmin);
  if (!loaded.ok) return loaded;
  const earliest = loaded.rows.reduce(
    (min, r) => (r.createdAt < min ? r.createdAt : min),
    loaded.rows[0]!.createdAt,
  );

  // Selepas 24 jam — pemilik mesti memohon; tempahan kekal sehingga diluluskan.
  if (!isAdmin && !isWithinGrace(earliest)) {
    return submitRequest(ids, userId, { type: "CANCEL" });
  }

  await db
    .update(roomBookings)
    .set({ status: "CANCELLED", updatedAt: new Date() })
    .where(inArray(roomBookings.id, ids));

  await db.insert(auditLog).values({
    action: "ROOM_CANCEL",
    userId,
    detail: { bookingIds: ids },
  });

  revalidatePath("/bilik");
  revalidatePath("/dashboard");
  return { ok: true, mode: "applied" };
}

type GroupRow = typeof roomBookings.$inferSelect;

/**
 * Selaraskan baris tempahan sedia ada kepada set slot sasaran:
 * guna semula baris yang ada, batalkan lebihan, sisip slot yang kurang.
 * Menyokong tukar slot tunggal ↔ sepanjang hari. Lebihan dibatalkan dahulu
 * supaya tidak melanggar keunikan slot aktif (room_bookings_active_unique).
 */
async function reconcileBookingSlots(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  group: GroupRow[],
  target: { roomId: number; tarikh: string; slots: Array<"AM" | "PM"> },
): Promise<void> {
  const needed = [...new Set(target.slots)];
  const used = new Set<number>();
  const assignments: Array<{ id: number | null; slot: "AM" | "PM" }> = [];

  // Utamakan baris yang sudah pada slot yang diperlukan (kurangkan perubahan).
  for (const slot of needed) {
    const match = group.find((b) => b.slot === slot && !used.has(b.id));
    if (match) {
      assignments.push({ id: match.id, slot });
      used.add(match.id);
    }
  }
  // Baki slot: guna semula baris bebas, atau sisip baris baharu.
  for (const slot of needed) {
    if (assignments.some((a) => a.slot === slot)) continue;
    const free = group.find((b) => !used.has(b.id));
    assignments.push({ id: free ? free.id : null, slot });
    if (free) used.add(free.id);
  }

  const surplus = group.filter((b) => !used.has(b.id));
  if (surplus.length > 0) {
    await tx
      .update(roomBookings)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(inArray(roomBookings.id, surplus.map((b) => b.id)));
  }

  const template = group[0]!;
  for (const a of assignments) {
    if (a.id != null) {
      await tx
        .update(roomBookings)
        .set({ roomId: target.roomId, tarikh: target.tarikh, slot: a.slot, updatedAt: new Date() })
        .where(eq(roomBookings.id, a.id));
    } else {
      await tx.insert(roomBookings).values({
        roomId: target.roomId,
        tarikh: target.tarikh,
        slot: a.slot,
        title: template.title,
        userId: template.userId,
        pergerakanId: template.pergerakanId,
        takwimAktivitiId: template.takwimAktivitiId,
        status: "BOOKED",
      });
    }
  }
}

/**
 * Ubah tempahan (tukar bilik / tarikh / slot). Slot boleh ditukar antara
 * Pagi, Petang dan Sepanjang hari (slot tunggal ↔ sepanjang hari).
 * - Admin atau pemilik dalam 24 jam: ubah terus.
 * - Pemilik selepas 24 jam: hantar permohonan ubah; tempahan asal kekal sehingga diluluskan.
 */
export async function modifyBooking(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const userId = Number(user.id);
  const parsed = modifySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah" };
  }
  const { bookingIds, roomId, tarikh, fullDay } = parsed.data;
  const ids = [...new Set(bookingIds)];
  const targetSlots: Array<"AM" | "PM"> = fullDay ? ["AM", "PM"] : [parsed.data.slot!];

  const isAdmin = user.peranan === "Admin";
  const loaded = await loadGroup(ids, userId, isAdmin);
  if (!loaded.ok) return loaded;
  const rows = loaded.rows;

  const currentSlots = new Set(rows.map((r) => r.slot));
  const sameRoomDate = rows.every((r) => r.roomId === roomId && r.tarikh === tarikh);
  const sameSlots =
    currentSlots.size === targetSlots.length && targetSlots.every((s) => currentSlots.has(s));
  if (sameRoomDate && sameSlots) {
    return { ok: false, error: "Tiada perubahan pada tempahan." };
  }

  for (const slot of targetSlots) {
    if (await slotTaken(roomId, tarikh, slot, ids)) {
      return { ok: false, error: "Slot baharu sudah ditempah. Pilih tarikh atau slot lain." };
    }
  }

  // Selepas 24 jam — pemilik mesti memohon; tempahan asal kekal.
  const earliest = rows.reduce(
    (min, r) => (r.createdAt < min ? r.createdAt : min),
    rows[0]!.createdAt,
  );
  if (!isAdmin && !isWithinGrace(earliest)) {
    return submitRequest(ids, userId, {
      type: "MODIFY",
      newRoomId: roomId,
      newTarikh: tarikh,
      newSlot: fullDay ? null : parsed.data.slot!,
    });
  }

  try {
    await db.transaction(async (tx) => {
      await reconcileBookingSlots(tx, rows, { roomId, tarikh, slots: targetSlots });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { ok: false, error: "Slot baharu sudah ditempah." };
    }
    throw e;
  }

  await db.insert(auditLog).values({
    action: "ROOM_MODIFY",
    userId,
    detail: { bookingIds: ids, roomId, tarikh, slots: targetSlots },
  });

  revalidatePath("/bilik");
  revalidatePath("/dashboard");
  return { ok: true, mode: "applied" };
}

/** Cipta permohonan batal/ubah (PENDING). Satu permohonan PENDING sahaja setiap tempahan. */
async function submitRequest(
  ids: number[],
  userId: number,
  data:
    | { type: "CANCEL" }
    | { type: "MODIFY"; newRoomId: number; newTarikh: string; newSlot: "AM" | "PM" | null },
): Promise<ActionResult> {
  const bookingId = ids[0]!;
  const bookingId2 = ids[1] ?? null;

  const existing = await db
    .select({ id: bookingRequests.id })
    .from(bookingRequests)
    .where(
      and(
        eq(bookingRequests.status, "PENDING"),
        or(
          inArray(bookingRequests.bookingId, ids),
          bookingId2 != null ? inArray(bookingRequests.bookingId2, ids) : undefined,
        ),
      ),
    );
  if (existing.length > 0) {
    return { ok: false, error: "Sudah ada permohonan menunggu kelulusan untuk tempahan ini." };
  }

  try {
    const [reqRow] = await db
      .insert(bookingRequests)
      .values({
        bookingId,
        bookingId2,
        userId,
        type: data.type,
        newRoomId: data.type === "MODIFY" ? data.newRoomId : null,
        newTarikh: data.type === "MODIFY" ? data.newTarikh : null,
        newSlot: data.type === "MODIFY" ? data.newSlot : null,
      })
      .returning({ id: bookingRequests.id });

    await db.insert(auditLog).values({
      action: "ROOM_REQUEST",
      userId,
      detail: { requestId: reqRow!.id, bookingIds: ids, type: data.type },
    });

    revalidatePath("/bilik");
    revalidatePath("/admin/bilik-permohonan");
    return { ok: true, mode: "requested" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { ok: false, error: "Sudah ada permohonan menunggu kelulusan untuk tempahan ini." };
    }
    throw e;
  }
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
      roomId: roomBookings.roomId,
      roomName: rooms.name,
      roomCode: rooms.code,
      tarikh: roomBookings.tarikh,
      slot: roomBookings.slot,
      title: roomBookings.title,
      takwimAktivitiId: roomBookings.takwimAktivitiId,
      pegawaiNama: users.nama,
      createdAt: roomBookings.createdAt,
      pendingType: bookingRequests.type,
    })
    .from(roomBookings)
    .innerJoin(rooms, eq(rooms.id, roomBookings.roomId))
    .innerJoin(users, eq(users.id, roomBookings.userId))
    .leftJoin(
      bookingRequests,
      and(
        eq(bookingRequests.bookingId, roomBookings.id),
        eq(bookingRequests.status, "PENDING"),
      ),
    )
    .where(and(eq(roomBookings.userId, Number(user.id)), eq(roomBookings.status, "BOOKED")))
    .orderBy(desc(roomBookings.tarikh));
}

// ── Permohonan batal/ubah (kelulusan Admin) ─────────────────────────────

/** Bilangan permohonan menunggu kelulusan — untuk lencana navigasi Admin. */
export async function countPendingBookingRequests(): Promise<number> {
  const user = await requireUser();
  if (user.peranan !== "Admin") return 0;
  const rows = await db
    .select({ id: bookingRequests.id })
    .from(bookingRequests)
    .where(eq(bookingRequests.status, "PENDING"));
  return rows.length;
}

/** Senarai permohonan menunggu kelulusan, dengan butiran tempahan asal dan cadangan baharu. */
export async function listPendingBookingRequests() {
  const user = await requireUser();
  if (user.peranan !== "Admin") return [];
  const newRoom = alias(rooms, "new_room");
  return db
    .select({
      requestId: bookingRequests.id,
      type: bookingRequests.type,
      createdAt: bookingRequests.createdAt,
      pemohonNama: users.nama,
      bookingId: roomBookings.id,
      bookingId2: bookingRequests.bookingId2,
      title: roomBookings.title,
      currentRoomName: rooms.name,
      currentTarikh: roomBookings.tarikh,
      currentSlot: roomBookings.slot,
      bookingStatus: roomBookings.status,
      newRoomName: newRoom.name,
      newTarikh: bookingRequests.newTarikh,
      newSlot: bookingRequests.newSlot,
    })
    .from(bookingRequests)
    .innerJoin(roomBookings, eq(roomBookings.id, bookingRequests.bookingId))
    .innerJoin(rooms, eq(rooms.id, roomBookings.roomId))
    .innerJoin(users, eq(users.id, bookingRequests.userId))
    .leftJoin(newRoom, eq(newRoom.id, bookingRequests.newRoomId))
    .where(eq(bookingRequests.status, "PENDING"))
    .orderBy(asc(bookingRequests.createdAt));
}

export type DecideResult = { ok: true } | { ok: false; error: string };

/** Admin luluskan / tolak permohonan. Luluskan baru menggerakkan tempahan asal. */
export async function decideBookingRequest(
  requestId: number,
  decision: "APPROVE" | "REJECT",
): Promise<DecideResult> {
  const user = await requireUser();
  if (user.peranan !== "Admin") return { ok: false, error: "Hanya pentadbir" };
  const adminId = Number(user.id);

  const req = await db.query.bookingRequests.findFirst({
    where: eq(bookingRequests.id, requestId),
  });
  if (!req) return { ok: false, error: "Permohonan tidak dijumpai" };
  if (req.status !== "PENDING") return { ok: false, error: "Permohonan telah diproses" };

  const ids = [req.bookingId, ...(req.bookingId2 != null ? [req.bookingId2] : [])];
  // Slot sasaran (null = sepanjang hari). Boleh berbeza bilangan slot daripada tempahan asal.
  const targetSlots: Array<"AM" | "PM"> = req.newSlot ? [req.newSlot] : ["AM", "PM"];
  const bookings = await db.select().from(roomBookings).where(inArray(roomBookings.id, ids));
  if (bookings.length !== ids.length) return { ok: false, error: "Tempahan tidak dijumpai" };

  if (decision === "REJECT") {
    await db
      .update(bookingRequests)
      .set({ status: "REJECTED", decidedByUserId: adminId, decidedAt: new Date(), updatedAt: new Date() })
      .where(eq(bookingRequests.id, requestId));
    await db.insert(auditLog).values({
      action: "ROOM_REQUEST_REJECT",
      userId: adminId,
      detail: { requestId, bookingIds: ids, type: req.type },
    });
    revalidatePath("/admin/bilik-permohonan");
    revalidatePath("/bilik");
    return { ok: true };
  }

  // APPROVE — gerakkan tempahan asal.
  if (bookings.some((b) => b.status !== "BOOKED")) {
    return { ok: false, error: "Tempahan sudah tidak aktif. Tolak permohonan ini." };
  }

  if (req.type === "MODIFY") {
    if (!req.newRoomId || !req.newTarikh) {
      return { ok: false, error: "Permohonan ubah tidak lengkap" };
    }
    for (const slot of targetSlots) {
      if (await slotTaken(req.newRoomId, req.newTarikh, slot, ids)) {
        return { ok: false, error: "Slot baharu kini sudah ditempah. Tolak atau minta tarikh lain." };
      }
    }
  }

  try {
    await db.transaction(async (tx) => {
      if (req.type === "CANCEL") {
        await tx
          .update(roomBookings)
          .set({ status: "CANCELLED", updatedAt: new Date() })
          .where(inArray(roomBookings.id, ids));
      } else {
        await reconcileBookingSlots(tx, bookings, {
          roomId: req.newRoomId!,
          tarikh: req.newTarikh!,
          slots: targetSlots,
        });
      }
      await tx
        .update(bookingRequests)
        .set({ status: "APPROVED", decidedByUserId: adminId, decidedAt: new Date(), updatedAt: new Date() })
        .where(eq(bookingRequests.id, requestId));
      await tx.insert(auditLog).values({
        action: req.type === "CANCEL" ? "ROOM_REQUEST_CANCEL_OK" : "ROOM_REQUEST_MODIFY_OK",
        userId: adminId,
        detail: { requestId, bookingIds: ids },
      });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { ok: false, error: "Slot baharu sudah ditempah." };
    }
    throw e;
  }

  revalidatePath("/admin/bilik-permohonan");
  revalidatePath("/bilik");
  revalidatePath("/dashboard");
  return { ok: true };
}
