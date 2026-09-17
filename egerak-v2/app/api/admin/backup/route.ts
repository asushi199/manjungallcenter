import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { createBackupArchive, recordBackupAudit } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const admin = await requireAdmin();

  try {
    const archive = await createBackupArchive();
    await recordBackupAudit({
      ok: true,
      userId: Number(admin.id),
      detail: {
        trigger: "manual",
        destination: "download",
        filename: archive.filename,
        byteSize: archive.byteSize,
        jsonBytes: archive.jsonBytes,
        rowCounts: archive.rowCounts,
      },
    });

    return new NextResponse(new Uint8Array(archive.gzip), {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${archive.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sandaran gagal";
    await recordBackupAudit({
      ok: false,
      userId: Number(admin.id),
      detail: {
        trigger: "manual",
        destination: "download",
        filename: "",
        byteSize: 0,
        rowCounts: {},
        error: message,
      },
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
