import "./load-env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "../lib/schema";
import { SEKTOR_SEED } from "../lib/sektors";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tidak ditetapkan");
  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client, { schema });

  for (const s of SEKTOR_SEED) {
    const existing = await db.query.sektors.findFirst({ where: eq(schema.sektors.code, s.code) });
    if (!existing) {
      await db.insert(schema.sektors).values(s);
      console.log("  + sektor:", s.code);
    } else {
      console.log("  = sektor sedia ada:", s.code);
    }
  }

  const adminUsername = (process.env.SEED_ADMIN_USERNAME ?? "admin").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "AdminMasuk!2026";
  const adminNama = process.env.SEED_ADMIN_NAMA ?? "Pentadbir Sistem";
  const adminJawatan = process.env.SEED_ADMIN_JAWATAN ?? "PEGAWAI USTP";
  const adminSektorCode = process.env.SEED_ADMIN_SEKTOR_CODE ?? "USTP";

  const sektor = await db.query.sektors.findFirst({
    where: eq(schema.sektors.code, adminSektorCode),
  });

  const existingAdmin = await db.query.users.findFirst({
    where: eq(schema.users.username, adminUsername),
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await db.insert(schema.users).values({
      username: adminUsername,
      passwordHash,
      nama: adminNama,
      jawatan: adminJawatan,
      sektorId: sektor?.id ?? null,
      peranan: "Admin",
      aktif: true,
      mustChangePassword: true,
    });
    console.log(`\nAdmin awal dicipta:\n  username: ${adminUsername}\n  password: ${adminPassword}\n  Sila tukar password selepas log masuk pertama.`);
  } else {
    console.log("\nAdmin sedia ada:", adminUsername);
  }

  const ROOM_SEED = [
    { code: "BILIK_BUDIMAN", name: "Bilik Budiman" },
    { code: "DEWAN_BESTARI", name: "Dewan Bestari" },
  ];
  for (const r of ROOM_SEED) {
    const existing = await db.query.rooms.findFirst({ where: eq(schema.rooms.code, r.code) });
    if (!existing) {
      await db.insert(schema.rooms).values(r);
      console.log("  + bilik:", r.code);
    }
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
