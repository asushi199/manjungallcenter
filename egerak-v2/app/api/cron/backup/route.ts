import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, isCronSecretConfigured } from "@/lib/cron-auth";
import { runScheduledBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export const revalidate = 0;

async function handle(req: Request) {
  if (!isCronSecretConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Cron belum dikonfigurasi" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await runScheduledBackup();
    return NextResponse.json(
      { ok: true, ...result, ts: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: message, ts: new Date().toISOString() },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
