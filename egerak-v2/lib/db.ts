import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

import { normalizeDatabaseUrl } from "./database-url";

const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);

/** Vercel serverless: satu sambungan per instance; elak habiskan pool Supabase (≈15). */
const isServerless = process.env.VERCEL === "1";

const globalForPg = globalThis as unknown as {
  pg: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForPg.pg ??
  postgres(connectionString, {
    max: isServerless ? 1 : 5,
    idle_timeout: 20,
    /** Vercel cold-start + Supabase pooler kadang ambil >8s; 20s lebih selamat. */
    connect_timeout: 20,
    max_lifetime: 60 * 5,
    /** Wajib untuk Supabase Transaction pooler (port 6543). */
    prepare: false,
  });

globalForPg.pg = client;

export const db = drizzle(client, { schema });
export { schema };
