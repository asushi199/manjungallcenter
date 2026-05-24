/**
 * URL paparan gambar Drive untuk <img> / cetak.
 * `uc?export=view` sering gagal dalam pelayar; thumbnail lebih stabil.
 */

export function extractDriveFileId(
  storagePath?: string | null,
  publicUrl?: string | null,
): string | null {
  if (storagePath?.startsWith("drive/")) {
    const id = storagePath.slice("drive/".length).split("/")[0]?.trim();
    if (id) return id;
  }
  if (!publicUrl) return null;

  const fromQuery = publicUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (fromQuery?.[1]) return fromQuery[1];

  const fromPath = publicUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fromPath?.[1]) return fromPath[1];

  return null;
}

/** URL untuk embed dalam <img> (fail perlu "Anyone with the link") */
export function drivePhotoDisplayUrl(fileId: string, widthPx = 800): string {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${widthPx}`;
}

export function oprPhotoDisplayUrl(
  photo: { storagePath?: string | null; publicUrl?: string | null },
  widthPx = 800,
): string | null {
  const fileId = extractDriveFileId(photo.storagePath, photo.publicUrl);
  if (fileId) return drivePhotoDisplayUrl(fileId, widthPx);
  return photo.publicUrl ?? null;
}

/** Nilai untuk simpan dalam DB `public_url` (upload baharu) */
export function drivePhotoStoredPublicUrl(fileId: string): string {
  return drivePhotoDisplayUrl(fileId, 1200);
}
