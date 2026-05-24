import "./load-env";

import { normalizeDatabaseUrl } from "../lib/database-url";

let raw: string;
try {
  raw = normalizeDatabaseUrl(process.env.DATABASE_URL);
} catch {
  console.error("DATABASE_URL kosong. Semak fail .env.local dalam folder egerak-v2.");
  process.exit(1);
}

try {
  const u = new URL(raw);
  console.log("OK — URL boleh dibaca:");
  console.log("  Protokol :", u.protocol);
  console.log("  Username :", u.username);
  console.log("  Host     :", u.hostname, "(patut ada .supabase.com)");
  console.log("  Port     :", u.port || "(default)");
  console.log("  Database :", u.pathname);

  if (!u.hostname.includes("supabase")) {
    console.warn("\nAMARAN: Host tidak seperti Supabase. Salin semula dari Connect → DIRECT 5432.");
  }
  if (u.hostname.startsWith("postgres.")) {
    console.error(
      "\nRALAT: Host kelihatan seperti username. Biasanya password ada '@' atau tiada '@' sebelum aws-...",
    );
    process.exit(1);
  }
} catch (e) {
  console.error("URL tidak sah:", (e as Error).message);
  console.error("\nFormat betul (contoh):");
  console.error(
    "postgresql://postgres.jivktwgrtzunudtcsllj:KATA_LALUAN@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres",
  );
  process.exit(1);
}
