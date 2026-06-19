/**
 * Muat naik gambar OPR melalui Google Apps Script Web App (tanpa Service Account JSON).
 */

import { buildOprPhotoNaming, type OprPhotoMeta } from "@/lib/opr-photos";

const MAX_BYTES = 8 * 1024 * 1024; // elak timeout GAS

export function isGasStorageConfigured(): boolean {
  return !!(
    process.env.GAS_WEB_APP_URL?.trim() && process.env.GAS_UPLOAD_SECRET?.trim()
  );
}

export async function uploadOprPhotoViaGas(
  oprId: number,
  file: { name: string; type: string; buffer: Buffer },
  meta?: OprPhotoMeta,
): Promise<{ path: string; publicUrl: string }> {
  const url = process.env.GAS_WEB_APP_URL?.trim();
  const secret = process.env.GAS_UPLOAD_SECRET?.trim();
  if (!url || !secret) {
    throw new Error(
      "GAS belum dikonfigurasi: set GAS_WEB_APP_URL dan GAS_UPLOAD_SECRET (lihat docs/GAS_UPLOAD_SETUP.md).",
    );
  }

  if (file.buffer.byteLength > MAX_BYTES) {
    throw new Error("Saiz gambar melebihi 8 MB. Sila mampatkan atau pilih fail lebih kecil.");
  }

  // Nama self-describing + subfolder Tahun/Bulan/Sektor bila metadata ada;
  // jika tiada, kekal corak lama (rata) supaya tidak pecah.
  let driveName: string;
  let subPath: string[] = [];
  if (meta) {
    const naming = buildOprPhotoNaming(meta, file.name);
    driveName = naming.fileName;
    subPath = naming.subPath;
  } else {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    driveName = `opr-${oprId}-${Date.now()}_${safeName}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret,
      oprId,
      fileName: driveName,
      subPath,
      mimeType: file.type || "application/octet-stream",
      dataBase64: file.buffer.toString("base64"),
    }),
    redirect: "follow",
  });

  const text = await res.text();
  let json: {
    ok?: boolean;
    error?: string;
    path?: string;
    publicUrl?: string;
    fileId?: string;
  };

  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    throw new Error(
      `GAS tidak memulangkan JSON (HTTP ${res.status}). Semak URL Web App dan deploy "Execute as: Me".`,
    );
  }

  if (!res.ok || !json.ok) {
    throw new Error(json.error || `Muat naik GAS gagal (HTTP ${res.status})`);
  }

  if (!json.publicUrl || !json.path) {
    throw new Error("Respons GAS tidak lengkap (tiada publicUrl/path).");
  }

  return { path: json.path, publicUrl: json.publicUrl };
}

/**
 * Padam (trash) fail Drive melalui GAS — best-effort, tidak melontar ralat.
 * Dipanggil selepas baris DB dipadam supaya storan tidak menimbun fail yatim.
 */
export async function deleteOprPhotoViaGas(fileId: string): Promise<boolean> {
  const url = process.env.GAS_WEB_APP_URL?.trim();
  const secret = process.env.GAS_UPLOAD_SECRET?.trim();
  if (!url || !secret || !fileId) return false;

  // Timeout pendek — jangan biar UI menunggu jika GAS perlahan/sejuk.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, action: "delete", fileId }),
      redirect: "follow",
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    return !!(res.ok && json?.ok);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
