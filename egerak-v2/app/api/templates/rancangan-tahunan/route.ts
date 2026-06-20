import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { buildRancanganTemplateWorkbook } from "@/lib/rancangan-import";
import { requireImportRancanganAccess } from "@/lib/rbac";
import { sektors } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireImportRancanganAccess();
  const sektorRows = await db
    .select({ code: sektors.code, name: sektors.name })
    .from(sektors)
    .orderBy(asc(sektors.name));
  const workbook = buildRancanganTemplateWorkbook(sektorRows);

  return new NextResponse(new Uint8Array(workbook), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="rancangan-tahunan.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
