"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withDbTimeout } from "@/lib/db-timeout";
import { db } from "@/lib/db";
import { users, sektors, auditLog } from "@/lib/schema";
import { requireAdmin } from "@/lib/rbac";
import {
  PERANAN_VALUES,
  perananRequiresSektor,
  perananUsesLaporanSektorScope,
  type UserPeranan,
} from "@/lib/roles";
import { normalizeLaporanSektorIds } from "@/lib/laporan-sektor-scope";
import { isPenyeliaOnlySektorCode } from "@/lib/sektors";
import { formatTitleCase } from "@/lib/format-display-text";

const perananSchema = z.enum(PERANAN_VALUES);

export async function validateSektorPeranan(
  peranan: UserPeranan,
  sektorId: number | null | undefined,
): Promise<string | null> {
  if (perananRequiresSektor(peranan) && !sektorId) {
    return "Ketua Unit mesti mempunyai sektor.";
  }
  if (!sektorId) return null;
  const sek = await db.query.sektors.findFirst({ where: eq(sektors.id, sektorId) });
  if (sek && isPenyeliaOnlySektorCode(sek.code) && peranan !== "Penyelia") {
    return "Sektor Pegawai PPD hanya untuk peranan Penyelia.";
  }
  return null;
}

export async function validateLaporanSektorIds(
  peranan: UserPeranan,
  laporanSektorIds: number[],
): Promise<string | null> {
  if (perananUsesLaporanSektorScope(peranan)) {
    if (!laporanSektorIds.length) {
      return "Timbalan PPD mesti pilih sekurang-kurangnya satu sektor untuk laporan OPR.";
    }
  } else if (laporanSektorIds.length) {
    return "Skop sektor laporan hanya untuk peranan Timbalan PPD.";
  }
  for (const id of laporanSektorIds) {
    const sek = await db.query.sektors.findFirst({ where: eq(sektors.id, id) });
    if (!sek) return "Sektor laporan tidak sah.";
    if (isPenyeliaOnlySektorCode(sek.code)) {
      return "Pegawai PPD tidak boleh dalam skop Timbalan PPD.";
    }
  }
  return null;
}

const laporanSektorIdsSchema = z
  .union([z.array(z.number()), z.string()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (typeof v === "string") {
      return v
        .split(",")
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0);
    }
    return normalizeLaporanSektorIds(v);
  });

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
  peranan: perananSchema.default("Pengguna"),
  laporanSektorIds: laporanSektorIdsSchema,
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

  const sektorErr = await validateSektorPeranan(data.peranan, data.sektorId ?? null);
  if (sektorErr) return { ok: false, error: sektorErr };

  const laporanIds = perananUsesLaporanSektorScope(data.peranan)
    ? normalizeLaporanSektorIds(data.laporanSektorIds ?? [])
    : [];
  const laporanErr = await validateLaporanSektorIds(data.peranan, laporanIds);
  if (laporanErr) return { ok: false, error: laporanErr };

  const passwordHash = await bcrypt.hash(data.password, 10);
  await db.insert(users).values({
    username,
    passwordHash,
    nama: formatTitleCase(data.nama),
    jawatan: formatTitleCase(data.jawatan ?? ""),
    sektorId: data.sektorId ?? null,
    laporanSektorIds: laporanIds,
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
  peranan: perananSchema.optional(),
  laporanSektorIds: laporanSektorIdsSchema,
});

export async function adminUpdateUser(input: unknown): Promise<CreateUserResult> {
  const admin = await requireAdmin();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah" };

  const { userId, username, nama, jawatan, sektorId, peranan, laporanSektorIds } = parsed.data;
  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target) return { ok: false, error: "Pengguna tidak dijumpai" };

  const nextPeranan = (peranan ?? target.peranan) as UserPeranan;
  const nextSektorId = sektorId !== undefined ? sektorId : target.sektorId;
  const sektorErr = await validateSektorPeranan(nextPeranan, nextSektorId);
  if (sektorErr) return { ok: false, error: sektorErr };

  const nextLaporanIds = perananUsesLaporanSektorScope(nextPeranan)
    ? normalizeLaporanSektorIds(
        laporanSektorIds !== undefined ? laporanSektorIds : target.laporanSektorIds,
      )
    : [];
  const laporanErr = await validateLaporanSektorIds(nextPeranan, nextLaporanIds);
  if (laporanErr) return { ok: false, error: laporanErr };

  if (peranan !== undefined && peranan !== "Admin" && target.peranan === "Admin") {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.peranan, "Admin"));
    if (admins.length <= 1) {
      return { ok: false, error: "Sekurang-kurangnya satu pentadbir mesti kekal." };
    }
  }

  const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (nama !== undefined) patch.nama = formatTitleCase(nama);
  if (jawatan !== undefined) patch.jawatan = formatTitleCase(jawatan);
  if (sektorId !== undefined) patch.sektorId = sektorId;
  if (peranan !== undefined) patch.peranan = peranan;
  patch.laporanSektorIds = nextLaporanIds;

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
      laporanSektorIds: users.laporanSektorIds,
      aktif: users.aktif,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(sektors, eq(sektors.id, users.sektorId))
    .orderBy(asc(users.username));
}

/** Senarai sektor — tidak di-cache supaya sektor baharu (cth. Pegawai PPD) terus muncul selepas SQL/seed. */
export async function listAllSektors() {
  return withDbTimeout(db.select().from(sektors).orderBy(asc(sektors.name)));
}
