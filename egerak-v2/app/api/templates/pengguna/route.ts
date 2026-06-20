import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { buildUserTemplateWorkbook } from "@/lib/user-template";
import { requireAdmin } from "@/lib/rbac";
import { sektors } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();
  const sektorRows = await db
    .select({ code: sektors.code, name: sektors.name })
    .from(sektors)
    .orderBy(asc(sektors.name));
  const workbook = buildUserTemplateWorkbook(sektorRows);

  return new NextResponse(new Uint8Array(workbook), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="pengguna.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
