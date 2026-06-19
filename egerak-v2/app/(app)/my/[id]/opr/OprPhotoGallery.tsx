"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOprPhotoAction } from "@/lib/actions/opr";
import { OPR_MAX_PHOTOS } from "@/lib/opr-photos";

type Photo = {
  id: number;
  displayUrl: string | null;
};

type Props = {
  pergerakanId: number;
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  onDeleteError: (message: string) => void;
  storageEnabled: boolean;
  storageHint?: string;
  atPhotoLimit: boolean;
  uploadingPhoto: boolean;
  pending: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function OprPhotoGallery({
  pergerakanId,
  photos,
  onPhotosChange,
  onDeleteError,
  storageEnabled,
  storageHint,
  atPhotoLimit,
  uploadingPhoto,
  pending,
  onUpload,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function onDelete(photoId: number) {
    if (!confirm("Padam gambar ini? Fail turut dipadam dari Drive.")) return;
    // Kemas kini optimistik — buang serta-merta supaya pengguna boleh teruskan
    // tindakan lain tanpa menunggu pemadaman Drive di latar belakang.
    const prev = photos;
    onPhotosChange(photos.filter((p) => p.id !== photoId));
    startTransition(async () => {
      const res = await deleteOprPhotoAction(photoId, pergerakanId);
      if (!res.ok) {
        onPhotosChange(prev); // gulung semula jika gagal
        onDeleteError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      {!storageEnabled ? (
        <p className="text-sm text-slate-500">
          {storageHint ||
            "Muat naik gambar memerlukan Google Apps Script + Drive PPD (lihat docs/GAS_UPLOAD_SETUP.md)."}
        </p>
      ) : (
        <>
          {storageHint ? <p className="text-xs text-slate-500 mb-2">{storageHint}</p> : null}
          <input
            type="file"
            accept="image/*"
            className="input"
            onChange={onUpload}
            disabled={pending || uploadingPhoto || atPhotoLimit}
          />
          {atPhotoLimit ? (
            <p className="text-sm text-amber-800 mt-2">Had {OPR_MAX_PHOTOS} gambar telah dicapai.</p>
          ) : null}
          {(uploadingPhoto || (pending && !atPhotoLimit)) && (
            <p className="text-sm text-slate-600 mt-2">Memproses / memuat naik gambar…</p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            {photos.length}/{OPR_MAX_PHOTOS} gambar
          </p>
          <div className="flex flex-wrap gap-3 mt-3">
            {photos.map((ph) =>
              ph.displayUrl ? (
                <div key={ph.id} className="relative">
                  <img
                    src={ph.displayUrl}
                    alt=""
                    className="w-24 h-24 object-cover rounded border"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 rounded-full bg-red-600 text-white text-xs w-6 h-6 shadow hover:bg-red-700 disabled:opacity-50"
                    title="Padam gambar"
                    disabled={pending}
                    onClick={() => onDelete(ph.id)}
                  >
                    ×
                  </button>
                </div>
              ) : null,
            )}
          </div>
        </>
      )}
    </>
  );
}
