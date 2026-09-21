import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/schema";

export const PGDUMP_LAST_KEY = "backup:pgdump:last";

export type PgDumpLast = {
  at: string;
  fileName: string;
  sizeBytes: number;
};

export async function readLastPgDumpBackup(): Promise<PgDumpLast | null> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, PGDUMP_LAST_KEY))
    .limit(1);
  const raw = rows[0]?.value;
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  if (typeof v.at !== "string" || typeof v.fileName !== "string") return null;
  return {
    at: v.at,
    fileName: v.fileName,
    sizeBytes: typeof v.sizeBytes === "number" ? v.sizeBytes : 0,
  };
}

export async function writeLastPgDumpBackup(info: PgDumpLast): Promise<void> {
  await db
    .insert(appSettings)
    .values({
      key: PGDUMP_LAST_KEY,
      value: info,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: info, updatedAt: new Date() },
    });
}
