/**
 * Gambar OPR — backend:
 * - gas: Google Apps Script Web App (tanpa Service Account JSON) — disyorkan jika org policy block key
 * - drive: Service Account + Drive API
 * - supabase: Supabase Storage
 */

import {
  uploadOprPhotoViaGas,
  deleteOprPhotoViaGas,
  isGasStorageConfigured,
} from "@/lib/gas-upload";
import { isDriveStorageConfigured, uploadOprPhotoToDrive } from "@/lib/google-drive";
import { buildOprPhotoNaming, type OprPhotoMeta } from "@/lib/opr-photos";

export type OprPhotoStorageBackend = "gas" | "drive" | "supabase";

function isSupabaseStorageConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_STORAGE_BUCKET
  );
}

/** Backend aktif untuk muat naik gambar OPR */
export function resolveOprPhotoStorage(): OprPhotoStorageBackend | null {
  const pref = process.env.OPR_PHOTO_STORAGE?.trim().toLowerCase();

  if (pref === "gas") {
    return isGasStorageConfigured() ? "gas" : null;
  }
  if (pref === "supabase") {
    return isSupabaseStorageConfigured() ? "supabase" : null;
  }
  if (pref === "drive") {
    return isDriveStorageConfigured() ? "drive" : null;
  }

  if (isGasStorageConfigured()) return "gas";
  if (isDriveStorageConfigured()) return "drive";
  if (isSupabaseStorageConfigured()) return "supabase";
  return null;
}

export function isStorageConfigured(): boolean {
  return resolveOprPhotoStorage() !== null;
}

export function getStorageSetupHint(): string {
  const backend = resolveOprPhotoStorage();
  if (backend === "gas") {
    return "Gambar aktiviti akan disimpan bersama OPR.";
  }
  if (backend === "drive") {
    return "Gambar aktiviti akan disimpan bersama OPR.";
  }
  if (backend === "supabase") {
    return "Gambar aktiviti akan disimpan bersama OPR.";
  }
  return "Muat naik gambar belum tersedia.";
}

async function uploadOprPhotoToSupabase(
  oprId: number,
  file: { name: string; type: string; buffer: Buffer },
  meta?: OprPhotoMeta,
): Promise<{ path: string; publicUrl: string }> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "opr-photos";
  if (!base || !key) {
    throw new Error("Supabase Storage belum dikonfigurasi (URL + SERVICE_ROLE_KEY).");
  }

  // Susun mengikut Tahun/Bulan/Sektor bila metadata ada; jika tidak, kekal lama.
  let path: string;
  if (meta) {
    const { fileName, subPath } = buildOprPhotoNaming(meta, file.name);
    path = `opr/${subPath.join("/")}/${fileName}`;
  } else {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    path = `opr/${oprId}/${Date.now()}_${safeName}`;
  }

  const res = await fetch(`${base}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false",
    },
    body: new Uint8Array(file.buffer),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Muat naik gagal: ${err}`);
  }

  const publicUrl = `${base}/storage/v1/object/public/${bucket}/${path}`;
  return { path, publicUrl };
}

export async function uploadOprPhoto(
  oprId: number,
  file: { name: string; type: string; buffer: Buffer },
  meta?: OprPhotoMeta,
): Promise<{ path: string; publicUrl: string }> {
  const backend = resolveOprPhotoStorage();
  if (!backend) {
    throw new Error(getStorageSetupHint());
  }

  if (backend === "gas") {
    return uploadOprPhotoViaGas(oprId, file, meta);
  }
  if (backend === "drive") {
    return uploadOprPhotoToDrive(oprId, file, meta);
  }

  return uploadOprPhotoToSupabase(oprId, file, meta);
}

/** id Drive daripada storagePath "drive/{fileId}". */
function driveFileIdFromPath(storagePath: string): string | null {
  const m = /^drive\/(.+)$/.exec(storagePath);
  return m ? m[1] : null;
}

/**
 * Padam fail di storan selepas rekod DB dipadam — best-effort.
 * Hanya backend GAS yang menyokong padam jarak jauh buat masa ini;
 * backend lain dilangkau (rekod DB sudah dipadam).
 */
export async function deleteOprPhotoFromStorage(storagePath: string): Promise<boolean> {
  const backend = resolveOprPhotoStorage();
  if (backend === "gas") {
    const fileId = driveFileIdFromPath(storagePath);
    if (!fileId) return false;
    return deleteOprPhotoViaGas(fileId);
  }
  return false;
}
