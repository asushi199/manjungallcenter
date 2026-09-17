"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/rbac";
import { isGasStorageConfigured } from "@/lib/gas-upload";
import { isCronSecretConfigured } from "@/lib/cron-auth";
import {
  getBackupSettings,
  getLastDriveBackupAt,
  listRecentBackupRuns,
  persistBackupToDrive,
  saveBackupSettingsRow,
  type BackupRunDetail,
  type BackupSettings,
} from "@/lib/backup";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/schema";

export type BackupPageData = {
  settings: BackupSettings;
  driveConfigured: boolean;
  cronConfigured: boolean;
  lastDriveAt: string | null;
  runs: {
    id: number;
    ok: boolean;
    createdAt: string;
    trigger: BackupRunDetail["trigger"] | null;
    destination: BackupRunDetail["destination"] | null;
    filename: string;
    byteSize: number;
    error: string | null;
  }[];
};

export async function loadBackupPageData(): Promise<BackupPageData> {
  await requireAdmin();
  const [settings, lastDriveAt, runs] = await Promise.all([
    getBackupSettings(),
    getLastDriveBackupAt(),
    listRecentBackupRuns(20),
  ]);

  return {
    settings,
    driveConfigured: isGasStorageConfigured(),
    cronConfigured: isCronSecretConfigured(),
    lastDriveAt: lastDriveAt?.toISOString() ?? null,
    runs: runs.map((run) => ({
      id: run.id,
      ok: run.ok,
      createdAt: run.createdAt.toISOString(),
      trigger: run.detail?.trigger ?? null,
      destination: run.detail?.destination ?? null,
      filename: run.detail?.filename ?? "",
      byteSize: run.detail?.byteSize ?? 0,
      error: run.detail?.error ?? null,
    })),
  };
}

const settingsSchema = z.object({
  autoEnabled: z.boolean(),
  interval: z.enum(["daily", "weekly"]),
});

export async function saveBackupSettings(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak sah" };
  }

  if (parsed.data.autoEnabled && !isGasStorageConfigured()) {
    return {
      ok: false,
      error: "Sandaran automatik memerlukan Drive pejabat. Guna muat turun manual sementara itu.",
    };
  }

  await saveBackupSettingsRow(parsed.data);

  await db.insert(auditLog).values({
    action: "BACKUP_SETTINGS",
    userId: Number(admin.id),
    detail: parsed.data,
  });

  revalidatePath("/admin/sandaran");
  return { ok: true };
}

export async function backupToDriveNow(): Promise<
  { ok: true; filename: string; byteSize: number } | { ok: false; error: string }
> {
  const admin = await requireAdmin();
  try {
    const result = await persistBackupToDrive({
      trigger: "manual",
      userId: Number(admin.id),
    });
    revalidatePath("/admin/sandaran");
    return { ok: true, filename: result.filename, byteSize: result.byteSize };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sandaran gagal" };
  }
}

export type { BackupSettings };
