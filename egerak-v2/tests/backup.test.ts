import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BACKUP_FORMAT,
  BACKUP_KEEP_DRIVE_FILES,
  BACKUP_TABLE_NAMES,
  backupSubPath,
  buildBackupFilename,
  driveFileIdsToTrash,
  isBackupDue,
  parseBackupSettings,
} from "../lib/backup-utils";

test("backup table list covers the application schema", () => {
  assert.equal(BACKUP_FORMAT, "egerak-backup-v1");
  assert.deepEqual([...BACKUP_TABLE_NAMES], [
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
  ]);

  const schema = readFileSync("lib/schema.ts", "utf8");
  const backupIo = readFileSync("lib/backup.ts", "utf8");
  for (const name of BACKUP_TABLE_NAMES) {
    assert.match(schema, new RegExp(`pgTable\\(\\s*"${name}"`));
    assert.match(backupIo, new RegExp(`name: "${name}"`));
  }
});

test("buildBackupFilename uses PPD local time", () => {
  const name = buildBackupFilename(new Date("2026-09-17T18:05:00.000Z"));
  assert.equal(name, "egerak-backup-2026-09-18-0205.json.gz");
  assert.deepEqual(backupSubPath(new Date("2026-09-17T18:05:00.000Z")), [
    "sandaran",
    "2026",
    "2026-09",
  ]);
});

test("parseBackupSettings defaults and accepts weekly", () => {
  assert.deepEqual(parseBackupSettings(null), { autoEnabled: false, interval: "daily" });
  assert.deepEqual(parseBackupSettings({ autoEnabled: true, interval: "weekly" }), {
    autoEnabled: true,
    interval: "weekly",
  });
  assert.deepEqual(parseBackupSettings({ autoEnabled: "yes", interval: "monthly" }), {
    autoEnabled: false,
    interval: "daily",
  });
});

test("isBackupDue respects daily and weekly windows", () => {
  const now = new Date("2026-09-17T18:00:00.000Z");
  assert.equal(isBackupDue(null, "daily", now), true);
  assert.equal(isBackupDue(new Date("2026-09-17T02:00:00.000Z"), "daily", now), false);
  assert.equal(isBackupDue(new Date("2026-09-16T18:00:00.000Z"), "daily", now), true);
  assert.equal(isBackupDue(new Date("2026-09-12T18:00:00.000Z"), "weekly", now), false);
  assert.equal(isBackupDue(new Date("2026-09-10T18:00:00.000Z"), "weekly", now), true);
});

test("driveFileIdsToTrash keeps the newest files", () => {
  assert.equal(BACKUP_KEEP_DRIVE_FILES, 14);
  const runs = Array.from({ length: 16 }, (_, i) => ({
    detail: {
      trigger: "cron" as const,
      destination: "drive" as const,
      filename: `f-${i}`,
      byteSize: 1,
      rowCounts: {},
      driveFileId: `id-${i}`,
    },
  }));
  assert.deepEqual(driveFileIdsToTrash(runs, 14), ["id-14", "id-15"]);
  assert.deepEqual(
    driveFileIdsToTrash(
      [
        {
          detail: {
            trigger: "manual",
            destination: "download",
            filename: "x",
            byteSize: 1,
            rowCounts: {},
          },
        },
        {
          detail: {
            trigger: "cron",
            destination: "drive",
            filename: "y",
            byteSize: 1,
            rowCounts: {},
            driveFileId: "keep",
          },
        },
      ],
      1,
    ),
    [],
  );
});
