"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users, sektors, auditLog } from "@/lib/schema";
import { requireAdmin } from "@/lib/rbac";

const createSchema = z.object({
  username: z.string().min(3, "Username minimum 3 aksara").max(50),
  password: z.string().min(8, "Kata laluan minimum 8 aksara"),
  nama: z.string().min(1, "Nama diperlukan"),
  jawatan: z.string().default(""),
  sektorId: z
    .union([z.number(), z.string()])
    .transform((v) => (v === "" || v === null ? null : Number(v)))
    .nullable()
    .optional(),
  peranan: z.enum(["Admin", "Pengguna"]).default("Pengguna"),
});

export type CreateUserResult = { ok: true } | { ok: false; error: string };

export async function adminCreateUser(input: unknown): Promise<CreateUserResult> {
  const admin = await requireAdmin();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah" };
  const data = parsed.data;
  const username = data.username.trim().toLowerCase();

  const existing = await db.query.users.findFirst({ where: eq(users.username, username) });
  if (existing) return { ok: false, error: "Nama pengguna telah wujud" };

  const passwordHash = await bcrypt.hash(data.password, 10);
  await db.insert(users).values({
    username,
    passwordHash,
    nama: data.nama.trim(),
    jawatan: (data.jawatan ?? "").trim(),
    sektorId: data.sektorId ?? null,
    peranan: data.peranan,
    aktif: true,
    mustChangePassword: true,
  });

  await db.insert(auditLog).values({
    action: "ADMIN_CREATE_USER",
    userId: Number(admin.id),
    detail: { username },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

const resetSchema = z.object({
  userId: z.number().int().positive(),
  newPassword: z.string().min(8, "Kata laluan minimum 8 aksara"),
});

export async function adminResetPassword(input: unknown): Promise<CreateUserResult> {
  const admin = await requireAdmin();
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah" };

  const hash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db
    .update(users)
    .set({ passwordHash: hash, mustChangePassword: true, updatedAt: new Date() })
    .where(eq(users.id, parsed.data.userId));

  await db.insert(auditLog).values({
    action: "ADMIN_RESET_PASSWORD",
    userId: Number(admin.id),
    detail: { userId: parsed.data.userId },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

const toggleSchema = z.object({
  userId: z.number().int().positive(),
  aktif: z.boolean(),
});

export async function adminSetAktif(input: unknown): Promise<CreateUserResult> {
  const admin = await requireAdmin();
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah" };

  await db
    .update(users)
    .set({ aktif: parsed.data.aktif, updatedAt: new Date() })
    .where(eq(users.id, parsed.data.userId));

  await db.insert(auditLog).values({
    action: parsed.data.aktif ? "ADMIN_ACTIVATE_USER" : "ADMIN_DEACTIVATE_USER",
    userId: Number(admin.id),
    detail: { userId: parsed.data.userId },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function listAllUsers() {
  await requireAdmin();
  return db
    .select({
      id: users.id,
      username: users.username,
      nama: users.nama,
      jawatan: users.jawatan,
      sektorId: users.sektorId,
      sektorCode: sektors.code,
      sektorName: sektors.name,
      peranan: users.peranan,
      aktif: users.aktif,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(sektors, eq(sektors.id, users.sektorId))
    .orderBy(asc(users.username));
}

export async function listAllSektors() {
  return db.select().from(sektors).orderBy(asc(sektors.name));
}
