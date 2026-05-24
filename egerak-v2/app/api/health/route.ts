import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Endpoint kesihatan + keep-alive untuk Supabase Free tier.
 *
 * Supabase Free tier akan "scale-to-zero" compute selepas ~10 minit tanpa
 * aktiviti DB, menyebabkan request seterusnya tunggu lama (cold wake).
 * Tetapkan cron luar (cth. cron-job.org / UptimeRobot) untuk panggil
 * endpoint ini setiap 5 minit semasa waktu pejabat:
 *
 *   GET https://manjungegerak.vercel.app/api/health
 *
 * Respons:
 *   200 { ok: true, db: "up", latencyMs }
 *   503 { ok: false, db: "down", error }
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const started = Date.now();
  try {
    await db.execute(sql`select 1 as ok`);
    return NextResponse.json(
      {
        ok: true,
        db: "up",
        latencyMs: Date.now() - started,
        ts: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        db: "down",
        latencyMs: Date.now() - started,
        error: message,
        ts: new Date().toISOString(),
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }
}
