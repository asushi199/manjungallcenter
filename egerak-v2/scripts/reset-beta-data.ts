/**
 * Kosongkan data ujian beta — HARD DELETE dari Postgres.
 *
 * Kekal: sektors, rooms, users (lalai), struktur jadual.
 * Padam: takwim_aktiviti, pergerakan (+ opr + opr_photos cascade), room_bookings,
 * import_batches, audit_log.
 *
 * Penggunaan (dari folder egerak-v2, .env.local mesti ada DATABASE_URL):
 *   npm run db:reset-beta -- --confirm
 *   npm run db:reset-beta -- --confirm --purge-users
 *
 * --purge-users  = padam semua users KECUALI SEED_ADMIN_USERNAME (lalai: admin), kemudian npm run db:seed
 *
 * Gambar OPR di Google Drive TIDAK dipadam oleh skrip ini.
 */
import "./load-env";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ne } from "drizzle-orm";
import * as schema from "../lib/schema";

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");
const purgeUsers = args.includes("--purge-users");

async function main() {
  if (!confirm) {
    console.error(
      "\n⚠️  Operasi ini PADAM kekal data pergerakan, OPR, tempahan bilik, import & audit_log.\n" +
        "   Untuk teruskan:\n" +
        "   npm run db:reset-beta -- --confirm\n" +
        "   (tambah --purge-users jika mahu buang semua akaun kecuali admin seed)\n",
    );
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tidak ditetapkan dalam .env.local");

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client, { schema });

  console.log("\n🗑️  Reset data beta (production DB — pastikan URL betul)\n");
  console.log("   URL host:", url.replace(/:[^:@]+@/, ":****@").slice(0, 80) + "...\n");

  await db.transaction(async (tx) => {
    // Urutan: anak → ibu; TRUNCATE ... RESTART IDENTITY
    await tx.execute(sql`
      TRUNCATE TABLE
        opr_photos,
        opr,
        room_bookings,
        pergerakan,
        takwim_aktiviti,
        import_batches,
        audit_log
      RESTART IDENTITY CASCADE
    `);

    if (purgeUsers) {
      const keepUsername = (process.env.SEED_ADMIN_USERNAME ?? "admin").toLowerCase();
      const deleted = await tx
        .delete(schema.users)
        .where(ne(schema.users.username, keepUsername))
        .returning({ id: schema.users.id, username: schema.users.username });
      console.log(`   Users dipadam: ${deleted.length} (kekal: ${keepUsername})`);
    }
  });

  console.log("\n✅ Selesai. Dipadam:");
  console.log("   • pergerakan (termasuk yang aktif=false / soft delete)");
  console.log("   • opr + opr_photos");
  console.log("   • room_bookings");
  console.log("   • import_batches");
  console.log("   • audit_log");
  console.log("\n   Kekal: sektors, rooms" + (purgeUsers ? "" : ", semua users"));
  console.log("\n   Gambar di Google Drive: semak folder OPR secara manual jika perlu.");
  if (purgeUsers) {
    console.log("\n   Seterusnya: npm run db:seed  (sektor + admin + bilik)");
  }
  console.log("");

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
