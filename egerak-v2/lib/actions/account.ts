"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, auditLog } from "@/lib/schema";
import { requireUser } from "@/lib/rbac";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Sila masukkan kata laluan semasa"),
    newPassword: z.string().min(8, "Kata laluan baharu mesti sekurang-kurangnya 8 aksara"),
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Pengesahan kata laluan tidak sepadan",
  });

export async function changePassword(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const sess = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const { currentPassword, newPassword } = parsed.data;

  const row = await db.query.users.findFirst({ where: eq(users.id, Number(sess.id)) });
  if (!row) return { ok: false, error: "Pengguna tidak dijumpai" };

  const ok = await bcrypt.compare(currentPassword, row.passwordHash);
  if (!ok) return { ok: false, error: "Kata laluan semasa tidak betul" };

  const newHash = await bcrypt.hash(newPassword, 10);
  await db
    .update(users)
    .set({
      passwordHash: newHash,
      mustChangePassword: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, row.id));

  await db.insert(auditLog).values({
    action: "CHANGE_PASSWORD",
    userId: row.id,
    detail: {},
  });

  return { ok: true };
}
