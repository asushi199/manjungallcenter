import "./load-env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import * as schema from "../lib/schema";
import {
  parseCsv,
  parseFlexibleDate,
  resolveUsername,
  mapJenis,
  normalizeSektorCode,
} from "../lib/csv-parse";

/**
 * Import CSV dari eksport Pergerakan / Rancangan sheet lama.
 * Penggunaan: tsx scripts/import-from-sheet.ts <path-to.csv>
 */
async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Penggunaan: tsx scripts/import-from-sheet.ts <pergerakan.csv>");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL!;
  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client, { schema });

  const rows = parseCsv(readFileSync(file, "utf8"));
  console.log(`Baris CSV: ${rows.length}`);

  let ok = 0;
  let skip = 0;
  const sektors = await db.query.sektors.findMany();
  const sektorByCode = new Map(sektors.map((s) => [s.code, s] as const));

  for (const r of rows) {
    if (String(r.aktif ?? "TRUE").toUpperCase() === "FALSE") {
      skip++;
      continue;
    }
    const username = resolveUsername(r);
    if (!username) {
      skip++;
      continue;
    }
    const user = await db.query.users.findFirst({
      where: eq(schema.users.username, username),
    });
    if (!user) {
      console.warn("Pengguna tidak dijumpai (skip):", username);
      skip++;
      continue;
    }

    const sektorCode = normalizeSektorCode(r.sektor ?? "");
    const sektor = sektorByCode.get(sektorCode) ?? null;
    const pergi = parseFlexibleDate(r.tarikh_pergi ?? "");
    const kembali = parseFlexibleDate(r.tarikh_kembali ?? "");
    if (!pergi || !kembali) {
      skip++;
      continue;
    }

    await db.insert(schema.pergerakan).values({
      userId: user.id,
      sektorId: sektor?.id ?? user.sektorId ?? null,
      jenis: mapJenis(r.jenis ?? ""),
      urusan: r.urusan ?? "",
      lokasi: r.lokasi ?? "",
      tarikhPergi: pergi,
      tarikhKembali: kembali,
      aktif: true,
      source: "bulk",
    });
    ok++;
  }

  console.log(`Import selesai. ok=${ok} skip=${skip}`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
