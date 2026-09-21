/**
 * Tulis GitHub Actions secrets untuk sandaran pg_dump (jangan commit fail ini dengan nilai).
 * Jalankan: npx tsx scripts/set-github-backup-secrets.ts
 */
import { execSync } from "node:child_process";
import "./load-env";
import { normalizeDatabaseUrl } from "../lib/database-url";

const REPO = "asushi199/manjungallcenter";

function setSecret(name: string, value: string) {
  execSync(`gh secret set ${name} -R ${REPO}`, { input: value, stdio: ["pipe", "pipe", "pipe"] });
  console.log(`OK ${name}`);
}

function poolerSessionPgDumpUrl(): string {
  const url = normalizeDatabaseUrl(process.env.DATABASE_URL);
  const u = new URL(url);
  if (!u.hostname.includes("pooler.supabase.com")) {
    throw new Error("DATABASE_URL mesti pooler Supabase untuk derive PGDUMP session :5432");
  }
  u.port = "5432";
  u.searchParams.delete("pgbouncer");
  return u.toString();
}

function pgdumpUrl(): string {
  return poolerSessionPgDumpUrl();
}

function main() {
  const gasUrl = process.env.GAS_WEB_APP_URL?.trim();
  const gasSecret = process.env.GAS_UPLOAD_SECRET?.trim();
  if (!gasUrl || !gasSecret) throw new Error("GAS_WEB_APP_URL / GAS_UPLOAD_SECRET kosong");

  setSecret("PGDUMP_DATABASE_URL", pgdumpUrl());
  setSecret("DATABASE_URL", normalizeDatabaseUrl(process.env.DATABASE_URL));
  setSecret("GAS_WEB_APP_URL", gasUrl);
  setSecret("GAS_UPLOAD_SECRET", gasSecret);
  console.log(`Selesai — repo ${REPO}`);
}

main();
