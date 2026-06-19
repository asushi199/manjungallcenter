import "./load-env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, isNull, or } from "drizzle-orm";
import * as schema from "../lib/schema";
import { OPR_FOKUS_OPTIONS } from "../lib/opr-fokus";

/**
 * DEMO sahaja: isi medan `fokus` secara RAWAK bagi OPR yang masih kosong,
 * supaya carta Analisis Fokus ada data untuk dilihat. Nilai tidak bermakna.
 *
 *   npx tsx scripts/seed-random-fokus.ts            # pratonton (dry-run)
 *   npx tsx scripts/seed-random-fokus.ts --apply    # tulis ke DB
 */

const APPLY = process.argv.includes("--apply");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tidak ditetapkan");
  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client, { schema });
  const { opr } = schema;

  const rows = await db
    .select({ id: opr.id, fokus: opr.fokus })
    .from(opr)
    .where(or(isNull(opr.fokus), eq(opr.fokus, "")));

  const tally = new Map<string, number>();
  for (const r of rows) {
    const fokus = OPR_FOKUS_OPTIONS[Math.floor(Math.random() * OPR_FOKUS_OPTIONS.length)];
    tally.set(fokus, (tally.get(fokus) ?? 0) + 1);
    if (APPLY) {
      await db.update(opr).set({ fokus, updatedAt: new Date() }).where(eq(opr.id, r.id));
    }
  }

  console.log(`${rows.length} OPR tanpa fokus ${APPLY ? "diisi rawak" : "akan diisi"}:`);
  for (const [fokus, n] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${fokus}: ${n}`);
  }
  console.log(APPLY ? "✅ Selesai." : "ℹ️  Dry-run — guna --apply untuk menulis.");
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
