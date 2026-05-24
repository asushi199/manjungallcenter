/**
 * Muat naik gambar OPR melalui Google Apps Script Web App (tanpa Service Account JSON).
 */

const MAX_BYTES = 8 * 1024 * 1024; // elak timeout GAS

export function isGasStorageConfigured(): boolean {
  return !!(
    process.env.GAS_WEB_APP_URL?.trim() && process.env.GAS_UPLOAD_SECRET?.trim()
  );
}

export async function uploadOprPhotoViaGas(
  oprId: number,
  file: { name: string; type: string; buffer: Buffer },
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

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const driveName = `opr-${oprId}-${Date.now()}_${safeName}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret,
      oprId,
      fileName: driveName,
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
