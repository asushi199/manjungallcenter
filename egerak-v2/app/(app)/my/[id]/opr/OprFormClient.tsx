"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { OPR_FOKUS_OPTIONS } from "@/lib/opr-fokus";
import { oprStatusBadge } from "@/lib/opr-status";
import { buildOprGenerateKey } from "@/lib/opr-generate-lock";
import { cn } from "@/lib/cn";

function oprMsgTone(msg: string) {
  if (
    msg.includes("Gagal") ||
    msg.includes("Server Components") ||
    msg.includes("production builds") ||
    ((msg.includes("Gemini API") || msg.includes("Groq API")) && !msg.includes("Kuota"))
  ) {
    return "bg-red-50 border-red-200 text-red-800";
  }
  if (msg.includes("Kuota") || msg.includes("draf asas")) {
    return "bg-amber-50 border-amber-200 text-amber-900";
  }
  return "bg-emerald-50 border-emerald-200 text-emerald-800";
}

function isOprMsgError(msg: string) {
  return (
    msg.includes("Gagal") ||
    msg.includes("Server Components") ||
    msg.includes("production builds") ||
    ((msg.includes("Gemini API") || msg.includes("Groq API")) && !msg.includes("Kuota"))
  );
}

function formatJanaError(e: unknown): string {
  const raw = e instanceof Error ? e.message : "Gagal jana draf";
  if (raw.includes("Server Components") || raw.includes("production builds")) {
    return "Pelayan sibuk atau gangguan rangkaian. Jika Dapatan sudah berisi teks, teruskan edit; jika kosong, cuba Jana sekali lagi.";
  }
  return raw;
}

type FeedbackAnchor = "generate" | "form";

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
  /** Sektor mengikut profil pegawai (paparan sahaja, tidak boleh ubah). */
  profileSektorName: string;
  initial: {
    sektorOverrideId: number | null;
    fokus: string;
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
  profileSektorName,
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
  const previousPergerakanIdRef = useRef(pergerakanId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedbackAnchor, setFeedbackAnchor] = useState<FeedbackAnchor>("form");
  const generateInFlightRef = useRef(false);
  const siapActionsRef = useRef<HTMLDivElement | null>(null);

  const currentGenerateKey = useMemo(
    () => buildOprGenerateKey(form.maklumatTambahan, form.sasaran, form.notaPegawai),
    [form.maklumatTambahan, form.sasaran, form.notaPegawai],
  );

  const janaLocked = generatedKey === currentGenerateKey;
  const janaBusy = pending || isGenerating;
  // Dapatan (ringkas) wajib diisi sebelum boleh Jana draf AI.
  const dapatanRingkasEmpty = !form.notaPegawai.trim();
  // Fokus OPR wajib dipilih sebelum boleh Tandakan Siap.
  const fokusEmpty = !form.fokus.trim();

  // Dapatan / Rumusan / Refleksi hanya boleh diubah selepas draf dijana.
  // Draf dianggap wujud jika pernah dijana (ada kunci) atau sudah berisi teks.
  const outputsLocked =
    !generatedKey && !form.dapatan && !form.rumusan && !form.refleksi;

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  useEffect(() => {
    if (previousPergerakanIdRef.current !== pergerakanId) {
      previousPergerakanIdRef.current = pergerakanId;
      setGeneratedKey(initial.aiGenerateInputKey);
    }
  }, [pergerakanId, initial.aiGenerateInputKey]);

  // Hanya sync dari DB bila ada nilai — elak refresh timpa kunci client selepas Jana
  // (cth. lajur ai_generate_input_key belum wujud di Supabase).
  useEffect(() => {
    if (initial.aiGenerateInputKey != null && initial.aiGenerateInputKey !== "") {
      setGeneratedKey(initial.aiGenerateInputKey);
    }
  }, [initial.aiGenerateInputKey]);

  // Toast di bahagian bawah — kejayaan hilang sendiri; ralat kekal sehingga tindakan seterusnya.
  useEffect(() => {
    if (!msg || isOprMsgError(msg)) return;
    const t = setTimeout(() => setMsg(null), 4500);
    return () => clearTimeout(t);
  }, [msg]);

  function onSave(markSiap = false) {
    setFeedbackAnchor("form");
    setMsg(null);
    if (markSiap && fokusEmpty) {
      setMsg("Gagal: sila pilih Fokus sebelum menandakan siap.");
      return;
    }
    startTransition(async () => {
      const res = await saveOpr({
        pergerakanId,
        ...form,
        // Sektor sentiasa ikut profil pegawai — tiada override.
        sektorOverrideId: null,
        status: markSiap ? "SIAP" : form.status === "SIAP" ? "SIAP" : "DRAFT",
      });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      const nextStatus = markSiap ? "SIAP" : form.status === "SIAP" ? "SIAP" : "DRAFT";
      setForm((f) => ({ ...f, status: nextStatus }));
      if (!markSiap) {
        setMsg("Draf disimpan.");
      } else {
        setMsg(null);
        // Tatal ke butang tindakan (Cetak / Kembali) supaya kelihatan di telefon.
        setTimeout(() => {
          siapActionsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
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
    if (janaBusy || janaLocked || generateInFlightRef.current) return;
    if (dapatanRingkasEmpty) {
      setFeedbackAnchor("generate");
      setMsg("Gagal jana: sila isi Dapatan (ringkas) dahulu.");
      return;
    }

    generateInFlightRef.current = true;
    setIsGenerating(true);
    setFeedbackAnchor("generate");
    setMsg(null);

    startTransition(async () => {
      try {
        const draft = await generateOprDraft(pergerakanId, {
          sektorOverrideId: null,
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
        // Jangan router.refresh() — revalidatePath sudah dalam server action;
        // refresh RSC kadang gagal di production dan papar ralat "Server Components".
      } catch (e) {
        setMsg(formatJanaError(e));
      } finally {
        generateInFlightRef.current = false;
        setIsGenerating(false);
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
              <label className="label">Sektor</label>
              <div className="input bg-slate-50 text-slate-700 cursor-not-allowed">
                {profileSektorName}
              </div>
              <p className="text-xs text-slate-500 mt-1">Mengikut profil pegawai.</p>
            </div>
            <div>
              <label className="label">
                Fokus <span className="text-red-600">*</span>
              </label>
              <select
                className="input"
                value={form.fokus}
                onChange={(e) => setForm({ ...form, fokus: e.target.value })}
              >
                <option value="">— Pilih fokus —</option>
                {OPR_FOKUS_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              {fokusEmpty ? (
                <p className="text-xs text-slate-500 mt-1">
                  Wajib dipilih sebelum menandakan siap.
                </p>
              ) : null}
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
              <label className="label">
                Dapatan (ringkas) <span className="text-red-600">*</span>
              </label>
              <textarea
                className="input min-h-[60px]"
                value={form.notaPegawai}
                onChange={(e) => setForm({ ...form, notaPegawai: e.target.value })}
                placeholder="Penemuan sebenar di lapangan — jadi asas draf AI. Wajib diisi sebelum Jana."
              />
              {dapatanRingkasEmpty ? (
                <p className="text-xs text-slate-500 mt-1">
                  Wajib diisi sebelum menjana draf AI.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className={
                janaBusy || janaLocked || dapatanRingkasEmpty ? "btn-secondary" : "btn-primary"
              }
              disabled={janaBusy || janaLocked || dapatanRingkasEmpty}
              onClick={onGenerate}
              aria-busy={janaBusy}
              aria-disabled={janaBusy || janaLocked || dapatanRingkasEmpty}
            >
              {janaBusy
                ? "Menjana…"
                : janaLocked
                  ? "Draf dijana"
                  : "Jana Draf (AI)"}
            </button>
            {janaBusy ? (
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Sedang menjana draf AI… biasanya <strong>10–30 saat</strong>. Sila tunggu — jangan
                tutup halaman atau tekan semula.
              </p>
            ) : msg && feedbackAnchor === "generate" ? (
              <OprMsgBanner msg={msg} />
            ) : null}
          </div>

          <div className="card p-4 space-y-3">
            {outputsLocked ? (
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Bahagian ini akan diisi selepas anda tekan <strong>Jana Draf (AI)</strong>. Anda
                boleh menyuntingnya selepas draf dijana.
              </p>
            ) : null}
            <label className="label">Dapatan</label>
            <textarea
              className="input min-h-[120px] disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              value={form.dapatan}
              disabled={outputsLocked}
              onChange={(e) => setForm({ ...form, dapatan: e.target.value })}
            />
            <label className="label">Rumusan</label>
            <textarea
              className="input min-h-[80px] disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              value={form.rumusan}
              disabled={outputsLocked}
              onChange={(e) => setForm({ ...form, rumusan: e.target.value })}
            />
            <label className="label">Refleksi</label>
            <textarea
              className="input min-h-[100px] disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              value={form.refleksi}
              disabled={outputsLocked}
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

          {msg && feedbackAnchor === "form" ? <OprMsgBanner msg={msg} /> : null}

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
              disabled={pending || isSiap || fokusEmpty}
              onClick={() => onSave(true)}
            >
              {isSiap ? "Sudah Siap" : "Tandakan Siap"}
            </button>
          </div>

          {isSiap && (
            <div
              ref={siapActionsRef}
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 flex flex-wrap items-center gap-2 scroll-mt-4"
            >
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
