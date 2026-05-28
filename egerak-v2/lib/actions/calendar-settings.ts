"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { requireUser } from "@/lib/rbac";

export type CalendarWeekStartsOn = "mon" | "sun";
export type CalendarGridOrientation = "horizontal" | "vertical";
export type CalendarDefaultView = "month" | "week";

const weekStartsOnSchema = z.enum(["mon", "sun"]);
const gridOrientationSchema = z.enum(["horizontal", "vertical"]);
const defaultViewSchema = z.enum(["month", "week"]);

export type CalendarSettings = {
  weekStartsOn: CalendarWeekStartsOn;
  gridOrientation: CalendarGridOrientation;
  defaultView: CalendarDefaultView;
};

const saveSchema = z.object({
  weekStartsOn: weekStartsOnSchema.optional(),
  gridOrientation: gridOrientationSchema.optional(),
  defaultView: defaultViewSchema.optional(),
});

export async function getUserCalendarSettings(): Promise<CalendarSettings> {
  const session = await requireUser();
  const row = await db.query.users.findFirst({ where: eq(users.id, Number(session.id)) });
  if (!row) {
    return { weekStartsOn: "mon", gridOrientation: "horizontal", defaultView: "month" };
  }

  return {
    weekStartsOn: (row.calendarWeekStartsOn ?? "mon") as CalendarWeekStartsOn,
    gridOrientation: (row.calendarGridOrientation ?? "horizontal") as CalendarGridOrientation,
    defaultView: (row.calendarDefaultView ?? "month") as CalendarDefaultView,
  };
}

export async function saveUserCalendarSettings(input: unknown): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await requireUser();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah" };
  }

  const patch = {
    updatedAt: new Date(),
  } as Record<string, unknown>;

  if (parsed.data.weekStartsOn !== undefined) {
    patch.calendarWeekStartsOn = parsed.data.weekStartsOn;
  }
  if (parsed.data.gridOrientation !== undefined) {
    patch.calendarGridOrientation = parsed.data.gridOrientation;
  }
  if (parsed.data.defaultView !== undefined) {
    patch.calendarDefaultView = parsed.data.defaultView;
  }

  if (Object.keys(patch).length === 1) {
    return { ok: false, error: "Tiada perubahan untuk disimpan" };
  }

  await db.update(users).set(patch).where(eq(users.id, Number(session.id)));
  revalidatePath("/dashboard");
  return { ok: true };
}
