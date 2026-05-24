import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Salin .env.local.example ke .env.local dan isi.");
}

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
    connect_timeout: 10,
    /** Wajib untuk Supabase Transaction pooler (port 6543). */
    prepare: false,
  });

globalForPg.pg = client;

export const db = drizzle(client, { schema });
export { schema };
