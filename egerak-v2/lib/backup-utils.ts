import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "./dates";

export const BACKUP_FORMAT = "egerak-backup-v1";
export const BACKUP_SETTINGS_KEY = "backup";
export const BACKUP_KEEP_DRIVE_FILES = 14;
export const BACKUP_MAX_DRIVE_BYTES = 8 * 1024 * 1024;

export const BACKUP_TABLE_NAMES = [
  "sektors",
  "users",
  "import_batches",
  "rooms",
  "takwim_aktiviti",
  "pergerakan",
  "room_bookings",
  "booking_requests",
  "opr",
  "opr_photos",
  "audit_log",
  "app_settings",
] as const;

export type BackupInterval = "daily" | "weekly";
export type BackupTrigger = "manual" | "cron";
export type BackupDestination = "download" | "drive";

export type BackupSettings = {
  autoEnabled: boolean;
  interval: BackupInterval;
};

export type BackupRunDetail = {
  trigger: BackupTrigger;
  destination: BackupDestination;
  filename: string;
  byteSize: number;
  jsonBytes?: number;
  rowCounts: Record<string, number>;
  driveFileId?: string;
  drivePath?: string;
  driveUrl?: string;
  error?: string;
};

export const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  autoEnabled: false,
  interval: "daily",
};

export function buildBackupFilename(at: Date = new Date()): string {
  const stamp = formatInTimeZone(at, TZ, "yyyy-MM-dd-HHmm");
  return `egerak-backup-${stamp}.json.gz`;
}

export function backupSubPath(at: Date = new Date()): string[] {
  const year = formatInTimeZone(at, TZ, "yyyy");
  const month = formatInTimeZone(at, TZ, "yyyy-MM");
  return ["sandaran", year, month];
}

/** Harian: elak dua kali dalam ~20 jam. Mingguan: elak dalam 6 hari. */
export function isBackupDue(
  lastDriveSuccessAt: Date | null,
  interval: BackupInterval,
  now: Date = new Date(),
): boolean {
  if (!lastDriveSuccessAt) return true;
  const minMs =
    interval === "weekly" ? 6 * 24 * 60 * 60 * 1000 : 20 * 60 * 60 * 1000;
  return now.getTime() - lastDriveSuccessAt.getTime() >= minMs;
}

export function parseBackupSettings(value: unknown): BackupSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_BACKUP_SETTINGS };
  const rec = value as Record<string, unknown>;
  return {
    autoEnabled: rec.autoEnabled === true,
    interval: rec.interval === "weekly" ? "weekly" : "daily",
  };
}

export function driveFileIdsToTrash(
  runs: { detail: BackupRunDetail | null }[],
  keep = BACKUP_KEEP_DRIVE_FILES,
): string[] {
  const ids: string[] = [];
  for (const run of runs) {
    const id = run.detail?.driveFileId?.trim();
    if (id) ids.push(id);
  }
  return ids.slice(keep);
}
