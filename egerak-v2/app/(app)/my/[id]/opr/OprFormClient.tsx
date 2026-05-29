"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import OprPhotoGallery from "./OprPhotoGallery";
import { useRouter } from "next/navigation";
import {
  saveOpr,
  generateOprDraft,
  uploadOprPhotoAction,
  reopenOprFromTiada,
} from "@/lib/actions/opr";
import Link from "next/link";
import { compressImageForOpr } from "@/lib/client/compress-image";
import { OPR_MAX_PHOTOS } from "@/lib/opr-photos";
import { oprStatusBadge } from "@/lib/opr-status";
import { buildOprGenerateKey } from "@/lib/opr-generate-lock";
import { cn } from "@/lib/cn";

function oprMsgTone(msg: string) {
  if (msg.includes("Gagal") || (msg.includes("Gemini API") && !msg.includes("Kuota"))) {
    return "bg-red-50 border-red-200 text-red-800";
  }
  if (msg.includes("Kuota") || msg.includes("draf asas")) {
    return "bg-amber-50 border-amber-200 text-amber-900";
  }
  return "bg-emerald-50 border-emerald-200 text-emerald-800";
}

function isOprMsgError(msg: string) {
  return msg.includes("Gagal") || (msg.includes("Gemini API") && !msg.includes("Kuota"));
}

function isOprMsgNearGenerate(msg: string) {
  return (
    msg.includes("Dijana") ||
    msg.includes("Gemini") ||
    msg.includes("Kuota") ||
    msg.includes("draf asas") ||
    msg.includes("Menjana") ||
    msg.toLowerCase().includes("jana draf")
  );
}

function OprMsgBanner({ msg }: { msg: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("rounded-md border text-sm px-3 py-2", oprMsgTone(msg))}
    >
      {msg}
    </div>
  );
}

type Props = {
  pergerakanId: number;
  /** Ke mana selepas selesai (lalai /my). */
  returnTo?: string;
  /** Label untuk butang patah balik. */
  returnLabel?: string;
  sektors: Array<{ id: number; code: string; name: string }>;
  initial: {
    sektorOverrideId: number | null;
    maklumatTambahan: string;
    sasaran: string;
    notaPegawai: string;
    dapatan: string;
    rumusan: string;
    refleksi: string;
    status: "TIADA" | "DRAFT" | "SIAP";
    /** Input terakhir ketika Jana AI (dari DB). */
    aiGenerateInputKey: string | null;
  };
  photos: Array<{
    id: number;
    displayUrl: string | null;
    publicUrl?: string | null;
    storagePath?: string;
  }>;
  storageEnabled: boolean;
  storageHint?: string;
};

export default function OprFormClient({
  pergerakanId,
  returnTo = "/my",
  returnLabel = "Pergerakan Saya",
  sektors,
  initial,
  photos: initialPhotos,
  storageEnabled,
  storageHint,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState(initial);
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const atPhotoLimit = photos.length >= OPR_MAX_PHOTOS;
  const [generatedKey, setGeneratedKey] = useState<string | null>(
    initial.aiGenerateInputKey,
  );

  const currentGenerateKey = useMemo(
    () => buildOprGenerateKey(form.maklumatTambahan, form.sasaran, form.notaPegawai),
    [form.maklumatTambahan, form.sasaran, form.notaPegawai],
  );

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  useEffect(() => {
    setGeneratedKey(initial.aiGenerateInputKey);
  }, [initial.aiGenerateInputKey]);

  // Toast di bahagian bawah — kejayaan hilang sendiri; ralat kekal sehingga tindakan seterusnya.
  useEffect(() => {
    if (!msg || isOprMsgError(msg)) return;
    const t = setTimeout(() => setMsg(null), 4500);
    return () => clearTimeout(t);
  }, [msg]);

  function onSave(markSiap = false) {
    setMsg(null);
    startTransition(async () => {
      const res = await saveOpr({
        pergerakanId,
        ...form,
        sektorOverrideId: form.sektorOverrideId || null,
        status: markSiap ? "SIAP" : form.status === "SIAP" ? "SIAP" : "DRAFT",
      });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      const nextStatus = markSiap ? "SIAP" : form.status === "SIAP" ? "SIAP" : "DRAFT";
      setForm((f) => ({ ...f, status: nextStatus }));
      setMsg(
        markSiap
          ? "OPR ditandakan siap — status dipaparkan di halaman ini dan dalam senarai Pergerakan Saya."
          : "Draf disimpan.",
      );
      router.refresh();
    });
  }

  function onReopen() {
    setMsg(null);
    startTransition(async () => {
      const res = await reopenOprFromTiada(pergerakanId);
      if (!res.ok) {
        setMsg(res.error ?? "Gagal membuka semula OPR");
        return;
      }
      setForm((f) => ({ ...f, status: "DRAFT" }));
      setMsg("OPR dibuka semula sebagai draf. Anda boleh mengisi dan menyimpan laporan.");
      router.refresh();
    });
  }

  function onGenerate() {
    setMsg(null);
    startTransition(async () => {
      try {
        const draft = await generateOprDraft(pergerakanId, {
          sektorOverrideId: form.sektorOverrideId,
          maklumatTambahan: form.maklumatTambahan,
          sasaran: form.sasaran,
          notaPegawai: form.notaPegawai,
        });
        setForm((f) => ({
          ...f,
          maklumatTambahan: form.maklumatTambahan,
          sasaran: form.sasaran,
          notaPegawai: form.notaPegawai,
          dapatan: draft.dapatan,
          rumusan: draft.rumusan,
          refleksi: draft.refleksi,
          status: "DRAFT",
        }));
        setGeneratedKey(currentGenerateKey);
        setMsg(draft.disclaimer);
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Gagal jana draf");
      }
    });
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (atPhotoLimit) {
      setMsg(`Maksimum ${OPR_MAX_PHOTOS} gambar bagi setiap OPR.`);
      return;
    }

    setUploadingPhoto(true);
    setMsg(null);
    startTransition(async () => {
      try {
        const { file: uploadFile, notice } = await compressImageForOpr(file);
        const fd = new FormData();
        fd.set("pergerakanId", String(pergerakanId));
        fd.set("file", uploadFile);
        const res = await uploadOprPhotoAction(fd);
        if (!res.ok) {
          setMsg(res.error);
          return;
        }
        const url = res.displayUrl ?? res.publicUrl;
        if (url) {
          setPhotos((p) => [
            ...p,
            { id: res.id, displayUrl: url, publicUrl: res.publicUrl },
          ]);
        }
        setMsg(
          notice ??
            `Gambar dimuat naik (${res.photoCount ?? photos.length + 1}/${OPR_MAX_PHOTOS}).`,
        );
        router.refresh();
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "Gagal memproses gambar");
      } finally {
        setUploadingPhoto(false);
      }
    });
  }

  const statusBadge = oprStatusBadge(form.status);
  const isSiap = form.status === "SIAP";
  const isTiada = form.status === "TIADA";
  const canEdit = !isTiada;

  return (
    <div className="space-y-4">
      {msg && !canEdit ? <OprMsgBanner msg={msg} /> : null}

      {isTiada && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 space-y-3">
          <p>
            <strong>OPR tidak diperlukan</strong> untuk rekod ini. Untuk menukar status, gunakan
            butang pada kad di{" "}
            <Link href="/my" className="text-brand-600 font-medium hover:underline">
              Pergerakan Saya
            </Link>
            .
          </p>
          {statusBadge ? (
            <span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span>
          ) : null}
          <div>
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={pending}
              onClick={onReopen}
            >
              Buka semula untuk isi OPR
            </button>
          </div>
        </div>
      )}

      {isSiap && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <strong>OPR telah ditandakan siap.</strong> Laporan dianggap muktamad untuk rekod ini. Anda
          masih boleh edit dan cetak semula jika perlu; &quot;Simpan Draf&quot; tidak menukar
          status kecuali anda ubah kandungan kemudian tekan semula &quot;Tandakan Siap&quot;.
        </div>
      )}

      {canEdit && statusBadge && !isSiap && form.status === "DRAFT" && (
        <p className="text-xs text-slate-500">
          Status semasa: <span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span>
          — tekan <strong>Tandakan Siap</strong> apabila laporan siap disemak.
        </p>
      )}

      {canEdit ? (
        <>
          <div className="card p-4 space-y-3">
            <div>
              <label className="label">Sektor (override jika perlu)</label>
              <select
                className="input"
                value={form.sektorOverrideId ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sektorOverrideId: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">Ikut profil pegawai</option>
                {sektors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Maklumat tambahan / objektif ringkas</label>
              <textarea
                className="input min-h-[80px]"
                value={form.maklumatTambahan}
                onChange={(e) => setForm({ ...form, maklumatTambahan: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Sasaran</label>
              <input
                className="input"
                value={form.sasaran}
                onChange={(e) => setForm({ ...form, sasaran: e.target.value })}
                placeholder="Contoh: Guru Besar SK, Penolong Kanan"
              />
            </div>
            <div>
              <label className="label">Nota pegawai (mentah)</label>
              <textarea
                className="input min-h-[60px]"
                value={form.notaPegawai}
                onChange={(e) => setForm({ ...form, notaPegawai: e.target.value })}
              />
            </div>
            <button
              type="button"
              className={generatedKey === currentGenerateKey ? "btn-secondary" : "btn-primary"}
              disabled={pending || generatedKey === currentGenerateKey}
              onClick={onGenerate}
              aria-disabled={pending || generatedKey === currentGenerateKey}
            >
              {pending ? "Menjana…" : generatedKey === currentGenerateKey ? "Draf dijana" : "Jana Draf (AI)"}
            </button>
            {msg && isOprMsgNearGenerate(msg) ? <OprMsgBanner msg={msg} /> : null}
          </div>

          <div className="card p-4 space-y-3">
            <label className="label">Dapatan</label>
            <textarea
              className="input min-h-[120px]"
              value={form.dapatan}
              onChange={(e) => setForm({ ...form, dapatan: e.target.value })}
            />
            <label className="label">Rumusan</label>
            <textarea
              className="input min-h-[80px]"
              value={form.rumusan}
              onChange={(e) => setForm({ ...form, rumusan: e.target.value })}
            />
            <label className="label">Refleksi</label>
            <textarea
              className="input min-h-[100px]"
              value={form.refleksi}
              onChange={(e) => setForm({ ...form, refleksi: e.target.value })}
            />
          </div>

          <div className="card p-4">
            <h2 className="font-semibold mb-2">Gambar aktiviti</h2>
            <p className="text-xs text-slate-500 mb-2">
              Maksimum {OPR_MAX_PHOTOS} gambar. <strong>Melintang (landskap) disyorkan</strong> untuk
              cetakan OPR; gambar menegak juga boleh dimuat naik. Dimampatkan automatik. Dalam cetakan,
              gambar disusun menegak di sebelah kanan.
            </p>
            <OprPhotoGallery
              pergerakanId={pergerakanId}
              photos={photos}
              onPhotosChange={setPhotos}
              onDeleteError={(error) => setMsg(error)}
              storageEnabled={storageEnabled}
              storageHint={storageHint}
              atPhotoLimit={atPhotoLimit}
              uploadingPhoto={uploadingPhoto}
              pending={pending}
              onUpload={onPhoto}
            />
          </div>

          {msg && !isOprMsgNearGenerate(msg) ? <OprMsgBanner msg={msg} /> : null}

          <div className="flex flex-wrap gap-2 justify-end items-center">
            <button
              type="button"
              className="btn-secondary"
              disabled={pending}
              onClick={() => onSave(false)}
            >
              Simpan Draf
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={pending || isSiap}
              onClick={() => onSave(true)}
            >
              {isSiap ? "Sudah Siap" : "Tandakan Siap"}
            </button>
          </div>

          {isSiap && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-emerald-900 font-medium mr-auto">
                Laporan siap — seterusnya?
              </span>
              <Link
                href={`/my/${pergerakanId}/opr/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm"
              >
                Cetak / Pratonton
              </Link>
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => router.push(returnTo)}
              >
                ← Kembali ke {returnLabel}
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
