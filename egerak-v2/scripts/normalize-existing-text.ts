import "./load-env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../lib/schema";
import { formatTitleCase } from "../lib/format-display-text";

/**
 * Normalisasi kes huruf (Title Case BM + kekal singkatan) bagi data sedia ada.
 *
 * Penggunaan:
 *   npx tsx scripts/normalize-existing-text.ts            # pratonton (dry-run, tiada tulis)
 *   npx tsx scripts/normalize-existing-text.ts --apply    # kemas kini DB
 *
 * Hanya baris yang BERUBAH dikemas kini. Jalankan dry-run dahulu untuk semak.
 */

const APPLY = process.argv.includes("--apply");

type FieldChange = { id: number; field: string; before: string; after: string };

function norm(value: string | null | undefined): string {
  return formatTitleCase(value ?? "");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tidak ditetapkan");

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client, { schema });

  const { users, pergerakan, opr, roomBookings } = schema;
  let grandTotal = 0;

  async function run(
    label: string,
    rows: Array<Record<string, unknown> & { id: number }>,
    fields: string[],
    update: (id: number, patch: Record<string, string>) => Promise<void>,
  ) {
    const changes: FieldChange[] = [];
    for (const row of rows) {
      const patch: Record<string, string> = {};
      for (const f of fields) {
        const before = (row[f] as string | null) ?? "";
        const after = norm(before);
        if (after !== before) {
          patch[f] = after;
          changes.push({ id: row.id, field: f, before, after });
        }
      }
      if (Object.keys(patch).length && APPLY) {
        await update(row.id, patch);
      }
    }

    grandTotal += changes.length;
    console.log(
      `\n[${label}] ${rows.length} baris disemak — ${changes.length} medan ${
        APPLY ? "dikemas kini" : "akan berubah"
      }.`,
    );
    const limit = process.argv.includes("--all") ? changes.length : 8;
    for (const c of changes.slice(0, limit)) {
      console.log(`  #${c.id} ${c.field}: "${c.before}" -> "${c.after}"`);
    }
    if (changes.length > limit) console.log(`  … dan ${changes.length - limit} lagi.`);
  }

  await run(
    "users",
    await db.select({ id: users.id, nama: users.nama, jawatan: users.jawatan }).from(users),
    ["nama", "jawatan"],
    (id, patch) => db.update(users).set(patch).where(eq(users.id, id)).then(() => undefined),
  );

  await run(
    "pergerakan",
    await db
      .select({ id: pergerakan.id, urusan: pergerakan.urusan, lokasi: pergerakan.lokasi })
      .from(pergerakan),
    ["urusan", "lokasi"],
    (id, patch) =>
      db.update(pergerakan).set(patch).where(eq(pergerakan.id, id)).then(() => undefined),
  );

  await run(
    "opr",
    await db.select({ id: opr.id, sasaran: opr.sasaran }).from(opr),
    ["sasaran"],
    (id, patch) => db.update(opr).set(patch).where(eq(opr.id, id)).then(() => undefined),
  );

  await run(
    "roomBookings",
    await db.select({ id: roomBookings.id, title: roomBookings.title }).from(roomBookings),
    ["title"],
    (id, patch) =>
      db.update(roomBookings).set(patch).where(eq(roomBookings.id, id)).then(() => undefined),
  );

  console.log(
    `\n${APPLY ? "✅ Selesai" : "ℹ️  Dry-run"} — jumlah ${grandTotal} medan ${
      APPLY ? "dikemas kini." : "akan berubah. Jalankan semula dengan --apply untuk menulis."
    }`,
  );

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
