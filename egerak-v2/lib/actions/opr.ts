"use server";

import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { opr, oprPhotos, pergerakan, users, sektors, auditLog } from "@/lib/schema";
import { requireUser } from "@/lib/rbac";
import { isFullAdmin, isKetuaOrTimbalan, isPenyelia } from "@/lib/roles";
import { generateOprWithAi, type OprPromptInput } from "@/lib/ai-opr";
import { buildOprGenerateKey } from "@/lib/opr-generate-lock";
import { formatDateTime } from "@/lib/dates";
import { OPR_MAX_PHOTOS } from "@/lib/opr-photos";
import { oprPhotoDisplayUrl } from "@/lib/opr-photo-url";
import { getStorageSetupHint, isStorageConfigured, uploadOprPhoto } from "@/lib/storage";
import { formatTitleCase } from "@/lib/format-display-text";

async function assertPergerakanAccess(pergerakanId: number, userId: number, peranan: string) {
  const row = await db.query.pergerakan.findFirst({
    where: eq(pergerakan.id, pergerakanId),
    with: { user: true, sektor: true },
  });
  if (!row) return null;
  const canViewAllOpr =
    isFullAdmin(peranan) || isPenyelia(peranan) || isKetuaOrTimbalan(peranan);
  if (!canViewAllOpr && row.userId !== userId) return null;
  return row;
}

export async function getOrCreateOpr(pergerakanId: number) {
  const session = await requireUser();
  const row = await assertPergerakanAccess(
    pergerakanId,
    Number(session.id),
    session.peranan,
  );
  if (!row) throw new Error("Tiada kebenaran atau rekod tidak dijumpai");

  let record = await db.query.opr.findFirst({
    where: eq(opr.pergerakanId, pergerakanId),
    with: { photos: true, sektorOverride: true },
  });

  if (!record) {
    const [created] = await db
      .insert(opr)
      .values({ pergerakanId, status: "DRAFT" })
      .returning();
    record = await db.query.opr.findFirst({
      where: eq(opr.id, created.id),
      with: { photos: true, sektorOverride: true },
    });
  }

  return { pergerakan: row, opr: record! };
}

const saveSchema = z.object({
  pergerakanId: z.number(),
  sektorOverrideId: z.number().nullable().optional(),
  maklumatTambahan: z.string().optional(),
  sasaran: z.string().optional(),
  notaPegawai: z.string().optional(),
  dapatan: z.string().optional(),
  rumusan: z.string().optional(),
  refleksi: z.string().optional(),
  status: z.enum(["TIADA", "DRAFT", "SIAP"]).optional(),
});

export async function saveOpr(input: unknown) {
  const session = await requireUser();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Input tidak sah" };

  const { pergerakanId, ...data } = parsed.data;
  const row = await assertPergerakanAccess(
    pergerakanId,
    Number(session.id),
    session.peranan,
  );
  if (!row) return { ok: false as const, error: "Tiada kebenaran" };

  const existing = await db.query.opr.findFirst({ where: eq(opr.pergerakanId, pergerakanId) });
  if (!existing) return { ok: false as const, error: "OPR tidak dijumpai" };

  const sasaran = formatTitleCase(data.sasaran ?? "");

  await db
    .update(opr)
    .set({
      sektorOverrideId: data.sektorOverrideId ?? null,
      maklumatTambahan: data.maklumatTambahan ?? "",
      sasaran,
      notaPegawai: data.notaPegawai ?? "",
      dapatan: data.dapatan ?? "",
      rumusan: data.rumusan ?? "",
      refleksi: data.refleksi ?? "",
      status: data.status ?? existing.status,
      updatedAt: new Date(),
    })
    .where(eq(opr.id, existing.id));

  const nextStatus = data.status ?? existing.status;
  await db.insert(auditLog).values({
    action:
      nextStatus === "SIAP"
        ? "OPR_FINAL"
        : nextStatus === "TIADA"
          ? "OPR_TIADA"
          : "OPR_SAVED",
    userId: Number(session.id),
    detail: { pergerakanId, oprId: existing.id, status: nextStatus },
  });

  revalidatePath(`/my/${pergerakanId}/opr`);
  revalidatePath("/my");
  return { ok: true as const };
}

/** Tandakan OPR tidak diperlukan (peserta / laporan oleh penganjur lain). */
export async function markOprTiada(pergerakanId: number): Promise<{ ok: boolean; error?: string }> {
  const session = await requireUser();
  const row = await assertPergerakanAccess(
    pergerakanId,
    Number(session.id),
    session.peranan,
  );
  if (!row) return { ok: false, error: "Tiada kebenaran atau rekod tidak dijumpai" };
  if (row.jenis !== "Pergerakan") {
    return { ok: false, error: "Cuti tidak memerlukan OPR" };
  }

  let existing = await db.query.opr.findFirst({ where: eq(opr.pergerakanId, pergerakanId) });
  if (!existing) {
    const [created] = await db
      .insert(opr)
      .values({ pergerakanId, status: "TIADA" })
      .returning();
    existing = created;
  } else {
    await db
      .update(opr)
      .set({ status: "TIADA", updatedAt: new Date() })
      .where(eq(opr.id, existing.id));
  }

  await db.insert(auditLog).values({
    action: "OPR_TIADA",
    userId: Number(session.id),
    detail: { pergerakanId, oprId: existing.id },
  });

  revalidatePath(`/my/${pergerakanId}/opr`);
  revalidatePath("/my");
  return { ok: true };
}

/** Buka semula OPR dari status TIADA (sedia untuk isi). */
export async function reopenOprFromTiada(
  pergerakanId: number,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireUser();
  const row = await assertPergerakanAccess(
    pergerakanId,
    Number(session.id),
    session.peranan,
  );
  if (!row) return { ok: false, error: "Tiada kebenaran atau rekod tidak dijumpai" };

  const existing = await db.query.opr.findFirst({ where: eq(opr.pergerakanId, pergerakanId) });
  if (!existing || existing.status !== "TIADA") {
    return { ok: false, error: "Rekod bukan status Tiada OPR" };
  }

  await db
    .update(opr)
    .set({ status: "DRAFT", updatedAt: new Date() })
    .where(eq(opr.id, existing.id));

  await db.insert(auditLog).values({
    action: "OPR_REOPENED",
    userId: Number(session.id),
    detail: { pergerakanId, oprId: existing.id },
  });

  revalidatePath(`/my/${pergerakanId}/opr`);
  revalidatePath("/my");
  return { ok: true };
}

export async function generateOprDraft(
  pergerakanId: number,
  form?: {
    sektorOverrideId?: number | null;
    maklumatTambahan?: string;
    sasaran?: string;
    notaPegawai?: string;
  },
) {
  const session = await requireUser();
  const data = await getOrCreateOpr(pergerakanId);
  const row = data.pergerakan;
  const o = data.opr;

  const maklumatTambahan = form?.maklumatTambahan ?? o.maklumatTambahan ?? "";
  const sasaran = formatTitleCase(form?.sasaran ?? o.sasaran ?? "");
  const notaPegawai = form?.notaPegawai ?? o.notaPegawai ?? "";
  const sektorOverrideId =
    form?.sektorOverrideId !== undefined ? form.sektorOverrideId : o.sektorOverrideId;

  await db
    .update(opr)
    .set({
      maklumatTambahan,
      sasaran,
      notaPegawai,
      sektorOverrideId: sektorOverrideId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(opr.id, o.id));

  let sektorName = row.sektor?.name ?? "PPD Manjung";
  if (sektorOverrideId) {
    const s = await db.query.sektors.findFirst({ where: eq(sektors.id, sektorOverrideId) });
    if (s) sektorName = s.name;
  }

  const promptInput: OprPromptInput = {
    nama: row.user?.nama ?? session.nama,
    jawatan: row.user?.jawatan ?? "",
    sektor: sektorName,
    urusan: row.urusan,
    lokasi: row.lokasi,
    tarikh: `${formatDateTime(row.tarikhPergi)} hingga ${formatDateTime(row.tarikhKembali)}`,
    maklumatTambahan,
    sasaran,
    notaPegawai,
  };

  const { draft, notice } = await generateOprWithAi(promptInput);
  const aiGenerateInputKey = buildOprGenerateKey(maklumatTambahan, sasaran, notaPegawai);

  await db
    .update(opr)
    .set({
      dapatan: draft.dapatan,
      rumusan: draft.rumusan,
      refleksi: draft.refleksi,
      status: "DRAFT",
      aiGenerateInputKey,
      updatedAt: new Date(),
    })
    .where(eq(opr.id, o.id));

  await db.insert(auditLog).values({
    action: "OPR_DRAFT",
    userId: Number(session.id),
    detail: { pergerakanId },
  });

  // Tiada revalidatePath di sini: halaman OPR sudah force-dynamic dan klien
  // mengemas kini borang terus dgn draf. Revalidate mencetus refresh RSC yang
  // kadangkala gagal ("Server Components render") walaupun Gemini berjaya.
  return {
    ...draft,
    disclaimer: notice,
  };
}

export type UploadOprPhotoResult =
  | { ok: false; error: string }
  | {
      ok: true;
      publicUrl: string;
      displayUrl: string;
      id: number;
      photoCount: number;
      maxPhotos: number;
    };

export async function uploadOprPhotoAction(
  formData: FormData,
): Promise<UploadOprPhotoResult> {
  const session = await requireUser();
  const pergerakanId = Number(formData.get("pergerakanId"));
  const file = formData.get("file") as File | null;
  if (!file || !pergerakanId) return { ok: false as const, error: "Fail tidak sah" };

  if (!isStorageConfigured()) {
    return {
      ok: false as const,
      error: getStorageSetupHint(),
    };
  }

  if (!file.type.startsWith("image/")) {
    return { ok: false as const, error: "Hanya fail gambar (JPG, PNG, …) dibenarkan." };
  }

  const data = await getOrCreateOpr(pergerakanId);
  if (data.pergerakan.userId !== Number(session.id) && session.peranan !== "Admin") {
    return { ok: false as const, error: "Tiada kebenaran" };
  }

  const [{ value: photoCount }] = await db
    .select({ value: count() })
    .from(oprPhotos)
    .where(eq(oprPhotos.oprId, data.opr.id));

  if (photoCount >= OPR_MAX_PHOTOS) {
    return {
      ok: false as const,
      error: `Maksimum ${OPR_MAX_PHOTOS} gambar bagi setiap OPR.`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "image/jpeg";
  const { path, publicUrl } = await uploadOprPhoto(data.opr.id, {
    name: file.name,
    type: mimeType,
    buffer,
  });

  const [inserted] = await db
    .insert(oprPhotos)
    .values({
      oprId: data.opr.id,
      storagePath: path,
      publicUrl,
      mimeType,
    })
    .returning({ id: oprPhotos.id });

  const displayUrl =
    oprPhotoDisplayUrl({ storagePath: path, publicUrl }) ?? publicUrl;

  revalidatePath(`/my/${pergerakanId}/opr`);
  return {
    ok: true,
    publicUrl,
    displayUrl,
    id: inserted.id,
    photoCount: photoCount + 1,
    maxPhotos: OPR_MAX_PHOTOS,
  };
}

export async function deleteOprPhotoAction(photoId: number, pergerakanId: number) {
  const session = await requireUser();
  if (!Number.isFinite(photoId) || !Number.isFinite(pergerakanId)) {
    return { ok: false as const, error: "Permintaan tidak sah" };
  }

  const row = await assertPergerakanAccess(
    pergerakanId,
    Number(session.id),
    session.peranan,
  );
  if (!row) return { ok: false as const, error: "Tiada kebenaran" };

  const photo = await db.query.oprPhotos.findFirst({
    where: eq(oprPhotos.id, photoId),
    with: { opr: true },
  });
  if (!photo || photo.opr.pergerakanId !== pergerakanId) {
    return { ok: false as const, error: "Gambar tidak dijumpai" };
  }

  await db.delete(oprPhotos).where(eq(oprPhotos.id, photoId));

  await db.insert(auditLog).values({
    action: "OPR_PHOTO_DELETE",
    userId: Number(session.id),
    detail: { pergerakanId, photoId, storagePath: photo.storagePath },
  });

  revalidatePath(`/my/${pergerakanId}/opr`);
  revalidatePath(`/my/${pergerakanId}/opr/print`);
  return { ok: true as const };
}

export async function listSektorsForOpr() {
  return db.select().from(sektors);
}
