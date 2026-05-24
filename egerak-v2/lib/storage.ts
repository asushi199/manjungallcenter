/**
 * Gambar OPR — backend:
 * - gas: Google Apps Script Web App (tanpa Service Account JSON) — disyorkan jika org policy block key
 * - drive: Service Account + Drive API
 * - supabase: Supabase Storage
 */

import { uploadOprPhotoViaGas, isGasStorageConfigured } from "@/lib/gas-upload";
import { isDriveStorageConfigured, uploadOprPhotoToDrive } from "@/lib/google-drive";

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
    return "Gambar disimpan dalam folder Google Drive PPD (muat naik melalui Apps Script).";
  }
  if (backend === "drive") {
    return "Gambar disimpan dalam folder Google Drive PPD bersama.";
  }
  if (backend === "supabase") {
    return "Gambar disimpan dalam Supabase Storage.";
  }
  return "Set GAS_WEB_APP_URL + GAS_UPLOAD_SECRET (lihat docs/GAS_UPLOAD_SETUP.md), atau Drive API / Supabase dalam .env.local.";
}

async function uploadOprPhotoToSupabase(
  oprId: number,
  file: { name: string; type: string; buffer: Buffer },
): Promise<{ path: string; publicUrl: string }> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "opr-photos";
  if (!base || !key) {
    throw new Error("Supabase Storage belum dikonfigurasi (URL + SERVICE_ROLE_KEY).");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `opr/${oprId}/${Date.now()}_${safeName}`;

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
): Promise<{ path: string; publicUrl: string }> {
  const backend = resolveOprPhotoStorage();
  if (!backend) {
    throw new Error(getStorageSetupHint());
  }

  if (backend === "gas") {
    return uploadOprPhotoViaGas(oprId, file);
  }
  if (backend === "drive") {
    return uploadOprPhotoToDrive(oprId, file);
  }

  return uploadOprPhotoToSupabase(oprId, file);
}
