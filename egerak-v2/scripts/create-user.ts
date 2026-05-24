import "./load-env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "../lib/schema";

/**
 * Penggunaan:
 *   pnpm tsx scripts/create-user.ts <username> <password> <nama> <jawatan> <sektor_code> [Admin|Pengguna]
 */
async function main() {
  const [usernameRaw, password, nama, jawatan, sektorCode, peranan = "Pengguna"] = process.argv.slice(2);
  if (!usernameRaw || !password || !nama) {
    console.error("Penggunaan: tsx scripts/create-user.ts <username> <password> <nama> <jawatan> <sektor_code> [Admin|Pengguna]");
    process.exit(1);
  }
  const username = usernameRaw.toLowerCase();

  const url = process.env.DATABASE_URL!;
  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client, { schema });

  const sektor = sektorCode
    ? await db.query.sektors.findFirst({ where: eq(schema.sektors.code, sektorCode) })
    : null;

  const existing = await db.query.users.findFirst({ where: eq(schema.users.username, username) });
  if (existing) {
    console.error("Pengguna sudah wujud:", username);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(schema.users).values({
    username,
    passwordHash,
    nama,
    jawatan: jawatan ?? "",
    sektorId: sektor?.id ?? null,
    peranan: peranan === "Admin" ? "Admin" : "Pengguna",
    aktif: true,
    mustChangePassword: true,
  });

  console.log("Pengguna dicipta:", username);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
