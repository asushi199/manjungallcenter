import {
  OPR_IMAGE_JPEG_QUALITY,
  OPR_IMAGE_MAX_EDGE_PX,
  OPR_IMAGE_SKIP_COMPRESS_BELOW_BYTES,
  OPR_IMAGE_TARGET_MAX_BYTES,
} from "@/lib/opr-photos";

export type CompressImageResult = {
  file: File;
  compressed: boolean;
  /** Mesej ringkas untuk UI (BM) */
  notice?: string;
};

const PORTRAIT_HINT =
  "Gambar menegak diterima. Untuk cetakan OPR, gambar melintang (landskap) lebih sesuai.";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isPortrait(width: number, height: number): boolean {
  return height > width;
}

function joinNotices(...parts: (string | undefined)[]): string | undefined {
  const text = parts.filter(Boolean).join(" ");
  return text || undefined;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name);
}

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
};

/**
 * Sesetengah Safari iPhone boleh memaparkan HEIF tetapi createImageBitmap gagal
 * membacanya. Cuba elemen <img> sebagai penyahkod kedua supaya fail HEIF boleh
 * tetap ditukar kepada JPEG sebelum dihantar ke storan.
 */
async function decodeImage(file: File): Promise<DecodedImage> {
  try {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      dispose: () => bitmap.close(),
    };
  } catch {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("Tidak dapat membaca fail gambar ini."));
        element.src = objectUrl;
      });
      return {
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        dispose: () => URL.revokeObjectURL(objectUrl),
      };
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }
}

/**
 * Mampatkan gambar besar di pelayar sebelum muat naik (JPEG, tepi panjang ≤ 1920px).
 * Gambar menegak dibenarkan; pengguna dinasihatkan gunakan landskap untuk cetakan.
 */
export async function compressImageForOpr(file: File): Promise<CompressImageResult> {
  if (!isImageFile(file)) {
    throw new Error("Hanya fail gambar dibenarkan.");
  }

  const image = await decodeImage(file);
  try {
    const portraitHint = isPortrait(image.width, image.height) ? PORTRAIT_HINT : undefined;

    const isAlreadySmall =
      file.size <= OPR_IMAGE_SKIP_COMPRESS_BELOW_BYTES &&
      (file.type === "image/jpeg" || file.type === "image/webp");

    if (isAlreadySmall) {
      return { file, compressed: false, notice: portraitHint };
    }

    let width = image.width;
    let height = image.height;
    const maxEdge = Math.max(width, height);

    if (maxEdge > OPR_IMAGE_MAX_EDGE_PX) {
      const scale = OPR_IMAGE_MAX_EDGE_PX / maxEdge;
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Pelayar tidak menyokong pemprosesan gambar.");
    }

    ctx.drawImage(image.source, 0, 0, width, height);

    let quality = OPR_IMAGE_JPEG_QUALITY;
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < 6; attempt++) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", quality);
      });
      if (!blob) {
        throw new Error("Gagal mampatkan gambar.");
      }
      if (blob.size <= OPR_IMAGE_TARGET_MAX_BYTES) break;
      quality -= 0.1;
      if (quality < 0.5) break;
    }

    const baseName = file.name.replace(/\.[^.]+$/i, "") || "gambar";
    const outFile = new File([blob!], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    const compressNotice =
      outFile.size < file.size
        ? `Gambar dimampatkan (${formatBytes(file.size)} → ${formatBytes(outFile.size)}).`
        : "Gambar diseragamkan sebagai JPEG.";

    return {
      file: outFile,
      compressed: true,
      notice: joinNotices(compressNotice, portraitHint),
    };
  } finally {
    image.dispose();
  }
}
