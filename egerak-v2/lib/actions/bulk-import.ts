"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { pergerakan, users, sektors, importBatches, auditLog } from "@/lib/schema";
import { requireImportRancanganAccess } from "@/lib/rbac";
import {
  isSektorIdInScope,
  resolveUserSektorScope,
  type SektorScope,
} from "@/lib/sektor-admin-scope";
import {
  parseCsv,
  parseCsvDateRange,
  csvDateUsesAmbiguousSlashFormat,
  resolveUsername,
  mapJenis,
  normalizeSektorCode,
  type CsvRow,
} from "@/lib/csv-parse";
import {
  resolveBookableRoomCode,
  syncRoomBookingsFromPergerakan,
} from "@/lib/sync-room-bookings";

export type ImportRowResult = {
  line: number;
  status: "OK" | "ERROR" | "SKIPPED";
  message: string;
  pergerakanId?: number;
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

async function processRow(
  row: CsvRow,
  line: number,
  sektorByCode: Map<string, { id: number }>,
  scope: SektorScope,
): Promise<ImportRowResult> {
  if (shouldSkipRow(row)) {
    return { line, status: "SKIPPED", message: "Sudah diimport / dilangkau" };
  }

  const username = resolveUsername(row);
  if (!username) {
    return { line, status: "ERROR", message: "Tiada email atau username" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });
  if (!user || !user.aktif) {
    const emailHint = (row.email ?? row["e-mel"] ?? "").trim();
    const hint = emailHint
      ? `${username} (e-mel: ${emailHint})`
      : username || "(kosong)";
    return {
      line,
      status: "ERROR",
      message: `Pengguna tidak dijumpai: ${hint}. Daftar di Admin → Pengguna dahulu.`,
    };
  }

  const urusan = (row.urusan ?? "").trim();
  const lokasi = (row.lokasi ?? "").trim();
  if (!urusan) {
    return { line, status: "ERROR", message: "Urusan kosong" };
  }

  const range = parseCsvDateRange(
    row.tarikh_pergi ?? row.tarikh_pergi_raw ?? "",
    row.tarikh_kembali ?? "",
  );
  if (!range) {
    return { line, status: "ERROR", message: "Tarikh pergi/kembali tidak sah" };
  }
  const { pergi, kembali, fullDay } = range;
  if (kembali.getTime() < pergi.getTime()) {
    return { line, status: "ERROR", message: "Tarikh kembali sebelum tarikh pergi" };
  }

  const sektorCode = normalizeSektorCode(row.sektor ?? "");
  const sektor = sektorCode ? sektorByCode.get(sektorCode) : null;
  const effectiveSektorId = sektor?.id ?? user.sektorId ?? null;

  if (!scope.allSectors && !isSektorIdInScope(effectiveSektorId, scope)) {
    return {
      line,
      status: "ERROR",
      message: "Sektor rekod di luar skop anda (semak lajur sektor atau profil pegawai).",
    };
  }

  const jenis = mapJenis(row.jenis ?? "");
  const roomCode = jenis === "Pergerakan" ? resolveBookableRoomCode(lokasi) : null;

  try {
    const inserted = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(pergerakan)
        .values({
          userId: user.id,
          sektorId: effectiveSektorId,
          jenis,
          urusan,
          lokasi,
          tarikhPergi: pergi,
          tarikhKembali: kembali,
          source: "bulk",
          aktif: true,
        })
        .returning({ id: pergerakan.id });

      if (roomCode) {
        const sync = await syncRoomBookingsFromPergerakan(tx, {
          pergerakanId: row.id,
          roomCode,
          userId: user.id,
          title: urusan,
          pergi,
          kembali,
          fullDay,
          auditUserId: user.id,
        });
        if (!sync.ok) throw new Error(sync.error);
      }

      return row;
    });

    return { line, status: "OK", message: "Berjaya", pergerakanId: inserted.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ralat tempahan bilik";
    if (/invalid time/i.test(msg)) {
      return {
        line,
        status: "ERROR",
        message:
          "Tarikh tidak sah (contoh: 6/14/2026 = 14 Jun). Gunakan format h/b/tahun atau yyyy-mm-dd.",
      };
    }
    return { line, status: "ERROR", message: msg };
  }
}

export async function importRancanganCsv(
  csvText: string,
  filename?: string,
): Promise<BulkImportResult> {
  const admin = await requireImportRancanganAccess();
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
  const rows = parseCsv(csvText);
  const sektorsList = await db.select().from(sektors);
  const sektorByCode = new Map(sektorsList.map((s) => [s.code, { id: s.id }]));

  const results: ImportRowResult[] = [];
  const dateFormatWarnings: string[] = [];
  let ok = 0;
  let error = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 2;
    const pergiRaw = row.tarikh_pergi ?? row.tarikh_pergi_raw ?? "";
    const kembaliRaw = row.tarikh_kembali ?? "";
    if (csvDateUsesAmbiguousSlashFormat(pergiRaw) || csvDateUsesAmbiguousSlashFormat(kembaliRaw)) {
      dateFormatWarnings.push(
        `Baris ${line}: tarikh format Excel (contoh 6/14/2026). Cadangan: 2026-06-14 — rujuk panduan format ISO.`,
      );
    }
    try {
      const r = await processRow(row, line, sektorByCode, scope);
      results.push(r);
      if (r.status === "OK") ok++;
      else if (r.status === "ERROR") error++;
      else skipped++;
    } catch (e) {
      error++;
      results.push({
        line: i + 2,
        status: "ERROR",
        message: e instanceof Error ? e.message : "Ralat tidak diketahui",
      });
    }
  }

  const [batch] = await db
    .insert(importBatches)
    .values({
      adminUserId: Number(admin.id),
      filename: filename ?? "upload.csv",
      stats: { ok, error, skipped },
    })
    .returning({ id: importBatches.id });

  await db.insert(auditLog).values({
    action: "BULK_IMPORT",
    userId: Number(admin.id),
    detail: { batchId: batch.id, ok, error, skipped },
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin/import");

  return { ok, error, skipped, batchId: batch.id, rows: results, dateFormatWarnings };
}
