import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { formatInTimeZone } from "date-fns-tz";
import { normalizeDatabaseUrl } from "@/lib/database-url";

const TZ = "Asia/Kuala_Lumpur";
const MAX_GAS_BYTES = 8 * 1024 * 1024;

/** URL untuk pg_dump — utamakan PGDUMP_DATABASE_URL; jika Direct (db.*.supabase.co) guna pooler :5432 untuk CI/IPv4. */
export function resolvePgDumpUrl(): string {
  const direct = process.env.PGDUMP_DATABASE_URL?.trim();
  const poolerFromApp = poolerSessionUrl(process.env.DATABASE_URL);

  if (direct) {
    const normalized = normalizeDatabaseUrl(direct);
    if (normalized.includes("db.") && normalized.includes(".supabase.co") && poolerFromApp) {
      console.warn(
        "PGDUMP Direct (db.*) — jika pg_dump gagal IPv6, guna pooler Session :5432 dalam PGDUMP_DATABASE_URL.",
      );
    }
    return normalized;
  }

  if (poolerFromApp) return poolerFromApp;

  throw new Error("DATABASE_URL atau PGDUMP_DATABASE_URL diperlukan untuk pg_dump.");
}

function poolerSessionUrl(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const u = new URL(normalizeDatabaseUrl(raw));
    if (!u.hostname.includes("pooler.supabase.com")) return null;
    u.port = "5432";
    u.searchParams.delete("pgbouncer");
    return u.toString();
  } catch {
    return null;
  }
}

export type PgDumpArtifacts = {
  sqlPath: string;
  gzPath: string;
  gzFileName: string;
  gzSizeBytes: number;
  subPath: string[];
};

export function runPgDump(appSlug: string): PgDumpArtifacts {
  const dbUrl = resolvePgDumpUrl();
  const now = new Date();
  const day = formatInTimeZone(now, TZ, "yyyy-MM-dd");
  const year = formatInTimeZone(now, TZ, "yyyy");
  const month = formatInTimeZone(now, TZ, "yyyy-MM");
  const outDir = path.join(process.cwd(), "backups", "pgdump");
  mkdirSync(outDir, { recursive: true });

  const sqlPath = path.join(outDir, `${appSlug}-backup-${day}.sql`);
  const dump = spawnSync(
    "pg_dump",
    [dbUrl, "--no-owner", "--no-acl", "-f", sqlPath],
    { encoding: "utf8", shell: process.platform === "win32" },
  );

  if (dump.error) {
    throw new Error(
      `pg_dump tidak dijumpai: ${dump.error.message}. Pasang PostgreSQL client.`,
    );
  }
  if (dump.status !== 0) {
    throw new Error(dump.stderr?.trim() || "pg_dump gagal.");
  }

  const gzFileName = `${appSlug}-backup-${day}.sql.gz`;
  const gzPath = path.join(outDir, gzFileName);
  const gzBuffer = gzipSync(readFileSync(sqlPath), { level: 9 });
  writeFileSync(gzPath, gzBuffer);

  if (gzBuffer.byteLength > MAX_GAS_BYTES) {
    console.warn(
      `AMARAN: ${gzFileName} (${(gzBuffer.byteLength / 1024 / 1024).toFixed(2)} MB) melebihi had GAS 8 MB — muat naik Drive mungkin gagal.`,
    );
  }

  return {
    sqlPath,
    gzPath,
    gzFileName,
    gzSizeBytes: gzBuffer.byteLength,
    subPath: ["_backup", "pgdump", year, month],
  };
}
