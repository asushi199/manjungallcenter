import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Salin .env.local.example ke .env.local dan isi.");
}

const globalForPg = globalThis as unknown as {
  pg: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForPg.pg ??
  postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalForPg.pg = client;

export const db = drizzle(client, { schema });
export { schema };
