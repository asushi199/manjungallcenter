"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auditLog, importBatches, sektors, takwimAktiviti } from "@/lib/schema";
import { requireImportRancanganAccess } from "@/lib/rbac";
import {
  isSektorIdInScope,
  resolveUserSektorScope,
  type SektorScope,
} from "@/lib/sektor-admin-scope";
import { csvDateUsesAmbiguousSlashFormat, parseCsv, type CsvRow } from "@/lib/csv-parse";
import {
  resolveBookableRoomCode,
  syncRoomBookingsFromTakwimAktiviti,
} from "@/lib/sync-room-bookings";
import {
  normalizeRancanganImportRow,
  readRancanganWorkbookRows,
} from "@/lib/rancangan-import";

export type ImportRowResult = {
  line: number;
  status: "OK" | "ERROR" | "SKIPPED";
  message: string;
  takwimAktivitiId?: number;
  roomBookingCount?: number;
};

export type BulkImportResult = {
  ok: number;
  error: number;
  skipped: number;
  batchId: number;
  rows: ImportRowResult[];
  /** Amaran: fail guna tarikh seperti 6/14/2026 (Excel), bukan 2026-06-14 */
  dateFormatWarnings: string[];
};

function shouldSkipRow(row: CsvRow): boolean {
  const st = (row.status_import ?? row.status ?? "").toUpperCase();
  return st === "OK" || st === "SKIP" || st === "SKIPPED";
}

function rowDateRaw(row: CsvRow, keys: string[]): string {
  const normalized = new Map(
    Object.entries(row).map(([k, v]) => [
      k
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, ""),
      v,
    ]),
  );
  for (const key of keys) {
    const v = normalized.get(key.toLowerCase().replace(/[\s_-]+/g, ""));
    if (v) return v;
  }
  return "";
}

function successMessage(roomBookingCount: number): string {
  const parts = ["Aktiviti Takwim dicipta"];
  if (roomBookingCount > 0) parts.push(`${roomBookingCount} slot bilik ditempah`);
  return parts.join("; ");
}

async function processRancanganRow(
  row: CsvRow,
  line: number,
  sektorByCode: Map<string, { id: number }>,
  scope: SektorScope,
  batchId: number,
  adminUserId: number,
): Promise<ImportRowResult> {
  if (shouldSkipRow(row)) {
    return { line, status: "SKIPPED", message: "Sudah diimport / dilangkau" };
  }

  const normalized = normalizeRancanganImportRow(row);
  if (!normalized.ok) {
    return { line, status: "ERROR", message: normalized.error };
  }
  const data = normalized.data;

  const sektor = sektorByCode.get(data.sektorCode);
  if (!sektor) {
    return { line, status: "ERROR", message: `Kod sektor tidak dijumpai: ${data.sektorCode}` };
  }

  if (!scope.allSectors && !isSektorIdInScope(sektor.id, scope)) {
    return {
      line,
      status: "ERROR",
      message: "Sektor rekod di luar skop anda.",
    };
  }

  try {
    // Rancangan diimport sebagai aktiviti master sahaja (tiada pegawai bertanggungjawab).
    // Pegawai "ambil" aktiviti melalui Daftar Pergerakan; bilik tetap ditempah lebih awal
    // supaya tidak diduduki orang lain.
    const inserted = await db.transaction(async (tx) => {
      const [aktiviti] = await tx
        .insert(takwimAktiviti)
        .values({
          sektorId: sektor.id,
          urusan: data.urusan,
          lokasi: data.lokasi,
          tarikhPergi: data.tarikhPergi,
          tarikhKembali: data.tarikhKembali,
          kategori: "rancangan",
          ownerUserId: null,
          importBatchId: batchId,
          createdByUserId: adminUserId,
          aktif: true,
        })
        .returning({ id: takwimAktiviti.id });

      let roomBookingCount = 0;
      const roomCode = resolveBookableRoomCode(data.lokasi);
      if (roomCode) {
        const sync = await syncRoomBookingsFromTakwimAktiviti(tx, {
          takwimAktivitiId: aktiviti.id,
          roomCode,
          userId: adminUserId,
          title: data.urusan,
          pergi: data.tarikhPergi,
          kembali: data.tarikhKembali,
          fullDay: data.fullDay,
          auditUserId: adminUserId,
        });
        if (!sync.ok) throw new Error(sync.error);
        roomBookingCount = sync.count;
      }

      return { takwimAktivitiId: aktiviti.id, roomBookingCount };
    });

    return {
      line,
      status: "OK",
      message: successMessage(inserted.roomBookingCount),
      ...inserted,
    };
  } catch (e) {
    return {
      line,
      status: "ERROR",
      message: e instanceof Error ? e.message : "Ralat import rancangan",
    };
  }
}

async function importRancanganRows(
  rows: CsvRow[],
  filename: string,
): Promise<BulkImportResult> {
  const admin = await requireImportRancanganAccess();
  const adminUserId = Number(admin.id);
  const scope = await resolveUserSektorScope(admin);
  if (scope.noAccess) {
    return {
      ok: 0,
      error: 0,
      skipped: 0,
      batchId: 0,
      rows: [
        {
          line: 0,
          status: "ERROR",
          message: "Akaun anda belum dikaitkan dengan sektor. Hubungi pentadbir.",
        },
      ],
      dateFormatWarnings: [],
    };
  }

  const [batch] = await db
    .insert(importBatches)
    .values({
      adminUserId,
      filename,
      stats: { ok: 0, error: 0, skipped: 0 },
    })
    .returning({ id: importBatches.id });

  const sektorsList = await db.select().from(sektors);
  const sektorByCode = new Map(sektorsList.map((s) => [s.code, { id: s.id }]));

  const results: ImportRowResult[] = [];
  const dateFormatWarnings: string[] = [];
  let ok = 0;
  let error = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const row = rows[i];
    const pergiRaw = rowDateRaw(row, ["Tarikh Mula", "tarikh_pergi"]);
    const kembaliRaw = rowDateRaw(row, ["Tarikh Tamat", "tarikh_kembali"]);
    if (csvDateUsesAmbiguousSlashFormat(pergiRaw) || csvDateUsesAmbiguousSlashFormat(kembaliRaw)) {
      dateFormatWarnings.push(
        `Baris ${line}: tarikh format Excel dikesan. Cadangan: guna 2026-06-14 dalam lajur tarikh dan pilih masa dalam lajur masa.`,
      );
    }

    const result = await processRancanganRow(row, line, sektorByCode, scope, batch.id, adminUserId);
    results.push(result);
    if (result.status === "OK") ok++;
    else if (result.status === "ERROR") error++;
    else skipped++;
  }

  await db
    .update(importBatches)
    .set({ stats: { ok, error, skipped } })
    .where(eq(importBatches.id, batch.id));

  await db.insert(auditLog).values({
    action: "BULK_IMPORT_RANCANGAN",
    userId: adminUserId,
    detail: { batchId: batch.id, ok, error, skipped },
  });

  revalidatePath("/dashboard");
  revalidatePath("/takwim");
  revalidatePath("/admin/import");

  return { ok, error, skipped, batchId: batch.id, rows: results, dateFormatWarnings };
}

export async function importRancanganCsv(
  csvText: string,
  filename?: string,
): Promise<BulkImportResult> {
  return importRancanganRows(parseCsv(csvText), filename ?? "upload.csv");
}

export async function importRancanganXlsx(
  workbookBase64: string,
  filename?: string,
): Promise<BulkImportResult> {
  const buffer = Buffer.from(workbookBase64, "base64");
  const parsed = readRancanganWorkbookRows(buffer);
  return importRancanganRows(parsed.rows, filename ?? "rancangan-tahunan.xlsx");
}
