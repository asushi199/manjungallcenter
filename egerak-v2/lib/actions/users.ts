"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq, asc } from "drizzle-orm";
import { revalidatePath, unstable_cache } from "next/cache";
import { withDbTimeout } from "@/lib/db-timeout";
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

const updateSchema = z.object({
  userId: z.number().int().positive(),
  username: z.string().min(3).max(50).optional(),
  nama: z.string().min(1).optional(),
  jawatan: z.string().optional(),
  sektorId: z
    .union([z.number(), z.string(), z.null()])
    .transform((v) => (v === "" || v === null || v === undefined ? null : Number(v)))
    .nullable()
    .optional(),
  peranan: z.enum(["Admin", "Pengguna"]).optional(),
});

export async function adminUpdateUser(input: unknown): Promise<CreateUserResult> {
  const admin = await requireAdmin();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah" };

  const { userId, username, nama, jawatan, sektorId, peranan } = parsed.data;
  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target) return { ok: false, error: "Pengguna tidak dijumpai" };

  if (peranan === "Pengguna" && target.peranan === "Admin") {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.peranan, "Admin"));
    if (admins.length <= 1) {
      return { ok: false, error: "Sekurang-kurangnya satu pentadbir mesti kekal." };
    }
  }

  const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (nama !== undefined) patch.nama = nama.trim();
  if (jawatan !== undefined) patch.jawatan = jawatan.trim();
  if (sektorId !== undefined) patch.sektorId = sektorId;
  if (peranan !== undefined) patch.peranan = peranan;

  if (username !== undefined) {
    const nextUsername = username.trim().toLowerCase();
    if (nextUsername !== target.username) {
      const clash = await db.query.users.findFirst({ where: eq(users.username, nextUsername) });
      if (clash) return { ok: false, error: "Nama pengguna telah digunakan" };
      patch.username = nextUsername;
    }
  }

  if (Object.keys(patch).length <= 1) {
    return { ok: false, error: "Tiada perubahan untuk disimpan" };
  }

  await db.update(users).set(patch).where(eq(users.id, userId));

  await db.insert(auditLog).values({
    action: "ADMIN_UPDATE_USER",
    userId: Number(admin.id),
    detail: { userId, fields: Object.keys(patch).filter((k) => k !== "updatedAt") },
  });

  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  revalidatePath("/my");
  return { ok: true };
}

export async function adminSetAktif(input: unknown): Promise<CreateUserResult> {
  const admin = await requireAdmin();
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah" };

  if (!parsed.data.aktif && parsed.data.userId === Number(admin.id)) {
    return { ok: false, error: "Tidak boleh nyahaktifkan akaun sendiri." };
  }

  const target = await db.query.users.findFirst({ where: eq(users.id, parsed.data.userId) });
  if (!target) return { ok: false, error: "Pengguna tidak dijumpai" };

  if (!parsed.data.aktif && target.peranan === "Admin") {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.peranan, "Admin"));
    if (admins.length <= 1) {
      return { ok: false, error: "Sekurang-kurangnya satu pentadbir mesti kekal aktif." };
    }
  }

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

const fetchAllSektors = unstable_cache(
  async () => withDbTimeout(db.select().from(sektors).orderBy(asc(sektors.name))),
  ["all-sektors"],
  { revalidate: 3600 },
);

export async function listAllSektors() {
  return fetchAllSektors();
}
