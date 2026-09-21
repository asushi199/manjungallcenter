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

function pgdumpUrl(): string {
  const direct = process.env.PGDUMP_DATABASE_URL?.trim();
  if (direct) return normalizeDatabaseUrl(direct);
  throw new Error("PGDUMP_DATABASE_URL kosong dalam .env.local");
}

function main() {
  const gasUrl = process.env.GAS_WEB_APP_URL?.trim();
  const gasSecret = process.env.GAS_UPLOAD_SECRET?.trim();
  if (!gasUrl || !gasSecret) throw new Error("GAS_WEB_APP_URL / GAS_UPLOAD_SECRET kosong");

  setSecret("PGDUMP_DATABASE_URL", pgdumpUrl());
  setSecret("GAS_WEB_APP_URL", gasUrl);
  setSecret("GAS_UPLOAD_SECRET", gasSecret);
  console.log(`Selesai — repo ${REPO}`);
}

main();
