import { gzipSync } from "node:zlib";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { TZ } from "./dates";
import {
  BACKUP_FORMAT,
  BACKUP_MAX_DRIVE_BYTES,
  BACKUP_SETTINGS_KEY,
  backupSubPath,
  buildBackupFilename,
  driveFileIdsToTrash,
  isBackupDue,
  parseBackupSettings,
  type BackupRunDetail,
  type BackupSettings,
  type BackupTrigger,
} from "./backup-utils";
import {
  deleteOprPhotoViaGas,
  isGasStorageConfigured,
  uploadBackupViaGas,
} from "./gas-upload";
import {
  appSettings,
  auditLog,
  bookingRequests,
  importBatches,
  opr,
  oprPhotos,
  pergerakan,
  roomBookings,
  rooms,
  sektors,
  takwimAktiviti,
  users,
} from "./schema";

export {
  BACKUP_FORMAT,
  BACKUP_KEEP_DRIVE_FILES,
  BACKUP_MAX_DRIVE_BYTES,
  BACKUP_SETTINGS_KEY,
  BACKUP_TABLE_NAMES,
  DEFAULT_BACKUP_SETTINGS,
  backupSubPath,
  buildBackupFilename,
  driveFileIdsToTrash,
  isBackupDue,
  parseBackupSettings,
} from "./backup-utils";
export type {
  BackupDestination,
  BackupInterval,
  BackupRunDetail,
  BackupSettings,
  BackupTrigger,
} from "./backup-utils";

export const BACKUP_TABLES = [
  { name: "sektors", table: sektors },
  { name: "users", table: users },
  { name: "import_batches", table: importBatches },
  { name: "rooms", table: rooms },
  { name: "takwim_aktiviti", table: takwimAktiviti },
  { name: "pergerakan", table: pergerakan },
  { name: "room_bookings", table: roomBookings },
  { name: "booking_requests", table: bookingRequests },
  { name: "opr", table: opr },
  { name: "opr_photos", table: oprPhotos },
  { name: "audit_log", table: auditLog },
  { name: "app_settings", table: appSettings },
] as const;

export type BackupPayload = {
  format: typeof BACKUP_FORMAT;
  exportedAt: string;
  timezone: typeof TZ;
  tables: Record<string, unknown[]>;
  rowCounts: Record<string, number>;
  sequences: Record<string, string | number | null>;
};

export type BackupArchive = {
  filename: string;
  gzip: Buffer;
  jsonBytes: number;
  byteSize: number;
  rowCounts: Record<string, number>;
};

function asRowArray(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as Record<string, unknown>[];
  }
  return [];
}

export async function buildBackupPayload(): Promise<BackupPayload> {
  const tables: Record<string, unknown[]> = {};
  const rowCounts: Record<string, number> = {};

  for (const { name, table } of BACKUP_TABLES) {
    const rows = await db.select().from(table);
    tables[name] = rows;
    rowCounts[name] = rows.length;
  }

  const seqResult = await db.execute(
    sql`SELECT sequencename, last_value FROM pg_sequences WHERE schemaname = 'public' ORDER BY sequencename`,
  );
  const sequences: Record<string, string | number | null> = {};
  for (const row of asRowArray(seqResult)) {
    const name = String(row.sequencename ?? "");
    if (!name) continue;
    sequences[name] = (row.last_value as string | number | null) ?? null;
  }

  return {
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    timezone: TZ,
    tables,
    rowCounts,
    sequences,
  };
}

export async function createBackupArchive(): Promise<BackupArchive> {
  const payload = await buildBackupPayload();
  const json = Buffer.from(JSON.stringify(payload), "utf8");
  const gzip = gzipSync(json, { level: 9 });
  return {
    filename: buildBackupFilename(),
    gzip,
    jsonBytes: json.byteLength,
    byteSize: gzip.byteLength,
    rowCounts: payload.rowCounts,
  };
}

export async function getBackupSettings(): Promise<BackupSettings> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, BACKUP_SETTINGS_KEY))
    .limit(1);
  return parseBackupSettings(rows[0]?.value);
}

export async function saveBackupSettingsRow(settings: BackupSettings): Promise<void> {
  await db
    .insert(appSettings)
    .values({
      key: BACKUP_SETTINGS_KEY,
      value: settings,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: settings, updatedAt: new Date() },
    });
}

export async function recordBackupAudit(opts: {
  ok: boolean;
  userId: number | null;
  detail: BackupRunDetail;
}): Promise<void> {
  await db.insert(auditLog).values({
    action: opts.ok ? "BACKUP_OK" : "BACKUP_ERROR",
    userId: opts.userId,
    detail: opts.detail,
  });
}

export async function listRecentBackupRuns(limit = 20): Promise<
  {
    id: number;
    ok: boolean;
    createdAt: Date;
    detail: BackupRunDetail | null;
  }[]
> {
  const rows = await db
    .select()
    .from(auditLog)
    .where(inArray(auditLog.action, ["BACKUP_OK", "BACKUP_ERROR"]))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    ok: row.action === "BACKUP_OK",
    createdAt: row.createdAt,
    detail: (row.detail ?? null) as BackupRunDetail | null,
  }));
}

export async function getLastDriveBackupAt(): Promise<Date | null> {
  const rows = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.action, "BACKUP_OK"))
    .orderBy(desc(auditLog.createdAt))
    .limit(40);

  for (const row of rows) {
    const dest = (row.detail as BackupRunDetail | null)?.destination;
    if (dest === "drive") return row.createdAt;
  }
  return null;
}

async function pruneOldDriveBackups(): Promise<void> {
  const recent = await listRecentBackupRuns(80);
  const ids = driveFileIdsToTrash(recent);
  for (const fileId of ids) {
    await deleteOprPhotoViaGas(fileId);
  }
}

export async function persistBackupToDrive(opts: {
  trigger: BackupTrigger;
  userId: number | null;
}): Promise<{
  filename: string;
  byteSize: number;
  rowCounts: Record<string, number>;
  driveFileId: string;
}> {
  if (!isGasStorageConfigured()) {
    const err = "Drive pejabat belum dikonfigurasi untuk sandaran.";
    await recordBackupAudit({
      ok: false,
      userId: opts.userId,
      detail: {
        trigger: opts.trigger,
        destination: "drive",
        filename: "",
        byteSize: 0,
        rowCounts: {},
        error: err,
      },
    });
    throw new Error(err);
  }

  try {
    const archive = await createBackupArchive();
    if (archive.byteSize > BACKUP_MAX_DRIVE_BYTES) {
      throw new Error(
        "Fail sandaran melebihi 8 MB selepas dimampatkan. Sila muat turun secara manual.",
      );
    }

    const uploaded = await uploadBackupViaGas({
      fileName: archive.filename,
      buffer: archive.gzip,
      subPath: backupSubPath(),
    });

    await recordBackupAudit({
      ok: true,
      userId: opts.userId,
      detail: {
        trigger: opts.trigger,
        destination: "drive",
        filename: archive.filename,
        byteSize: archive.byteSize,
        jsonBytes: archive.jsonBytes,
        rowCounts: archive.rowCounts,
        driveFileId: uploaded.fileId,
        drivePath: uploaded.path,
        driveUrl: uploaded.webViewUrl,
      },
    });

    try {
      await pruneOldDriveBackups();
    } catch {
      // best-effort
    }

    return {
      filename: archive.filename,
      byteSize: archive.byteSize,
      rowCounts: archive.rowCounts,
      driveFileId: uploaded.fileId,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await recordBackupAudit({
      ok: false,
      userId: opts.userId,
      detail: {
        trigger: opts.trigger,
        destination: "drive",
        filename: "",
        byteSize: 0,
        rowCounts: {},
        error: message,
      },
    });
    throw e;
  }
}

export async function runScheduledBackup(): Promise<
  | { status: "skipped"; reason: "disabled" | "not-due" }
  | { status: "ok"; filename: string; byteSize: number }
> {
  const settings = await getBackupSettings();
  if (!settings.autoEnabled) {
    return { status: "skipped", reason: "disabled" };
  }

  const lastDrive = await getLastDriveBackupAt();
  if (!isBackupDue(lastDrive, settings.interval)) {
    return { status: "skipped", reason: "not-due" };
  }

  const result = await persistBackupToDrive({ trigger: "cron", userId: null });
  return { status: "ok", filename: result.filename, byteSize: result.byteSize };
}
