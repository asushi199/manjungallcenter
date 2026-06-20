"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, sektors, auditLog } from "@/lib/schema";
import { requireAdmin } from "@/lib/rbac";
import {
  parseCsv,
  resolveUsername,
  normalizeSektorCode,
  mapPerananCsv,
  type CsvRow,
} from "@/lib/csv-parse";
import { validateSektorPeranan } from "@/lib/actions/users";
import { formatTitleCase } from "@/lib/format-display-text";

export type BulkUserImportRowResult = {
  line: number;
  status: "OK" | "UPDATED" | "ERROR" | "SKIPPED";
  message: string;
  userId?: number;
};

export type BulkUserImportResult = {
  ok: number;
  updated: number;
  error: number;
  skipped: number;
  rows: BulkUserImportRowResult[];
};

const importSchema = z.object({
  csvText: z.string().min(1),
  defaultPassword: z.string().min(8, "Kata laluan lalai minimum 8 aksara"),
  filename: z.string().optional(),
});

function isNoteRow(row: CsvRow): boolean {
  // parseCsv sudah buang baris email bermula "#"; tinggal semak username sahaja.
  return resolveUsername(row).startsWith("#");
}

function resolveNama(row: CsvRow): string {
  return (row.nama ?? row.name ?? "").trim();
}

async function processUserRow(
  row: CsvRow,
  line: number,
  sektorByCode: Map<string, { id: number }>,
  defaultPasswordHash: string,
): Promise<BulkUserImportRowResult> {
  if (isNoteRow(row)) {
    return { line, status: "SKIPPED", message: "Baris nota / kosong" };
  }

  const username = resolveUsername(row);
  const nama = formatTitleCase(resolveNama(row));
  if (!username && !nama) {
    return { line, status: "SKIPPED", message: "Tiada username atau nama" };
  }
  if (!username || username.length < 3) {
    return { line, status: "ERROR", message: "Username minimum 3 aksara (atau email sah)" };
  }
  if (!nama) {
    return { line, status: "ERROR", message: "Nama penuh diperlukan" };
  }

  const perananRaw = (row.peranan ?? row.role ?? "").trim();
  const peranan = mapPerananCsv(perananRaw);
  if (peranan === null) {
    return {
      line,
      status: "ERROR",
      message: `Peranan tidak dikenali: ${perananRaw || "(kosong)"}`,
    };
  }

  const sektorCode = normalizeSektorCode(row.sektor ?? "");
  const sektorId = sektorCode ? (sektorByCode.get(sektorCode)?.id ?? null) : null;
  if (sektorCode && sektorId == null) {
    return { line, status: "ERROR", message: `Kod sektor tidak dijumpai: ${sektorCode}` };
  }

  const sektorErr = await validateSektorPeranan(peranan, sektorId);
  if (sektorErr) return { line, status: "ERROR", message: sektorErr };

  const jawatan = formatTitleCase(row.jawatan ?? "");
  const existing = await db.query.users.findFirst({ where: eq(users.username, username) });

  if (existing) {
    if (
      existing.peranan === "Admin" &&
      peranan !== "Admin"
    ) {
      const admins = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.peranan, "Admin"));
      if (admins.length <= 1) {
        return {
          line,
          status: "ERROR",
          message: "Tidak boleh ubah satu-satunya pentadbir melalui import",
        };
      }
    }

    await db
      .update(users)
      .set({
        nama,
        jawatan,
        sektorId,
        peranan,
        laporanSektorIds: [],
        aktif: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id));

    return {
      line,
      status: "UPDATED",
      message: "Dikemas kini (kata laluan tidak ditukar)",
      userId: existing.id,
    };
  }

  const [created] = await db
    .insert(users)
    .values({
      username,
      passwordHash: defaultPasswordHash,
      nama,
      jawatan,
      sektorId,
      laporanSektorIds: [],
      peranan,
      aktif: true,
      mustChangePassword: true,
    })
    .returning({ id: users.id });

  return {
    line,
    status: "OK",
    message: "Pengguna baharu ditambah (kata laluan lalai)",
    userId: created?.id,
  };
}

export async function importUsersCsv(
  csvText: string,
  defaultPassword: string,
  filename?: string,
): Promise<BulkUserImportResult> {
  const admin = await requireAdmin();
  const parsed = importSchema.safeParse({ csvText, defaultPassword, filename });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Input tidak sah");
  }

  const defaultPasswordHash = await bcrypt.hash(parsed.data.defaultPassword, 10);
  const rows = parseCsv(parsed.data.csvText);
  const sektorsList = await db.select().from(sektors);
  const sektorByCode = new Map(sektorsList.map((s) => [s.code, { id: s.id }]));

  const results: BulkUserImportRowResult[] = [];
  let ok = 0;
  let updated = 0;
  let error = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    try {
      const r = await processUserRow(rows[i], line, sektorByCode, defaultPasswordHash);
      results.push(r);
      if (r.status === "OK") ok++;
      else if (r.status === "UPDATED") updated++;
      else if (r.status === "ERROR") error++;
      else skipped++;
    } catch (e) {
      error++;
      results.push({
        line,
        status: "ERROR",
        message: e instanceof Error ? e.message : "Ralat tidak diketahui",
      });
    }
  }

  await db.insert(auditLog).values({
    action: "BULK_IMPORT_USERS",
    userId: Number(admin.id),
    detail: {
      filename: parsed.data.filename ?? "upload.csv",
      ok,
      updated,
      error,
      skipped,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/dashboard");

  return { ok, updated, error, skipped, rows: results };
}
