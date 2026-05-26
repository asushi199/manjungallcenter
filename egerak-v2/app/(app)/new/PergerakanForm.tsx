"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import {
  submitPergerakan,
  updatePergerakan,
  checkPergerakanRoomAvailability,
  type RoomAvailabilityCheck,
  type PergerakanEditData,
  listLokasiSuggestionsForDay,
  type LokasiSuggestion,
  listUrusanTemplatesForDay,
  type UrusanTemplate,
} from "@/lib/actions/pergerakan";
import { resolveLokasiFields } from "@/lib/pergerakan-presets";
import { formatTarikhBm } from "@/lib/room-slots";
import DateTimeField from "@/components/DateTimeField";
import { DEFAULT_TIME_KEMBALI, DEFAULT_TIME_PERGI } from "@/lib/datetime-picker";
import { parseLocalInput, TZ } from "@/lib/dates";

const emptyAvailability: RoomAvailabilityCheck = {
  checking: false,
  applies: false,
  neededSlots: [],
  conflicts: [],
  fullDayBlockedDates: [],
  canBook: true,
  summary: null,
};

type Props = {
  lokasiPresets: string[];
  recentLokasi?: string[];
  mode?: "create" | "edit";
  editId?: number;
  initial?: PergerakanEditData;
};

export default function PergerakanForm({
  lokasiPresets,
  recentLokasi = [],
  mode = "create",
  editId,
  initial,
}: Props) {
  const isEdit = mode === "edit" && editId != null && initial != null;
  const lokasiInit = initial
    ? resolveLokasiFields(initial.lokasi, lokasiPresets)
    : { lokasiSel: lokasiPresets[0], lokasiLain: "" };

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [showBilikLink, setShowBilikLink] = useState(false);
  const [availability, setAvailability] = useState<RoomAvailabilityCheck>(emptyAvailability);
  const [checkingRoom, setCheckingRoom] = useState(false);
  const [lokasiSuggestDay, setLokasiSuggestDay] = useState<string | null>(null);
  const [lokasiSuggest, setLokasiSuggest] = useState<LokasiSuggestion[]>([]);
  const [lokasiSuggestPending, setLokasiSuggestPending] = useState(false);
  const [urusanSuggestDay, setUrusanSuggestDay] = useState<string | null>(null);
  const [urusanSuggest, setUrusanSuggest] = useState<UrusanTemplate[]>([]);
  const [urusanSuggestPending, setUrusanSuggestPending] = useState(false);

  const [jenis, setJenis] = useState<"Pergerakan" | "Bercuti">(initial?.jenis ?? "Pergerakan");
  const [lokasiSel, setLokasiSel] = useState(lokasiInit.lokasiSel);
  const [lokasiLain, setLokasiLain] = useState(lokasiInit.lokasiLain);
  const [urusan, setUrusan] = useState(initial?.urusan ?? "");
  const [tarikhPergi, setTarikhPergi] = useState(initial?.tarikhPergi ?? "");
  const [tarikhKembali, setTarikhKembali] = useState(initial?.tarikhKembali ?? "");
  const [sepenuhHari, setSepenuhHari] = useState(initial?.sepenuhHari ?? false);
  /** true = penganjur tempah slot; false = sertai aktiviti sedia ada */
  const [tempahBilik, setTempahBilik] = useState(initial?.tempahBilik ?? true);

  const isLainLain = lokasiSel === lokasiPresets[lokasiPresets.length - 1];
  const lokasi = isLainLain ? lokasiLain : lokasiSel;
  const needsRoom = /budiman|bestari/i.test(lokasi) && jenis === "Pergerakan";
  const willBookRoom = needsRoom && tempahBilik;

  useEffect(() => {
    if (!tarikhPergi) {
      setUrusanSuggestDay(null);
      setUrusanSuggest([]);
      setUrusanSuggestPending(false);
      return;
    }
    const d = parseLocalInput(tarikhPergi);
    if (!d) return;
    const ymd = formatInTimeZone(d, TZ, "yyyy-MM-dd");
    if (ymd === urusanSuggestDay) return;

    setUrusanSuggestPending(true);
    const timer = setTimeout(() => {
      listUrusanTemplatesForDay(ymd, 8)
        .then((r) => {
          setUrusanSuggestDay(ymd);
          setUrusanSuggest(r);
        })
        .catch(() => {
          setUrusanSuggestDay(ymd);
          setUrusanSuggest([]);
        })
        .finally(() => setUrusanSuggestPending(false));
    }, 350);

    return () => clearTimeout(timer);
  }, [tarikhPergi, urusanSuggestDay]);

  useEffect(() => {
    if (!tarikhPergi) {
      setLokasiSuggestDay(null);
      setLokasiSuggest([]);
      setLokasiSuggestPending(false);
      return;
    }
    const d = parseLocalInput(tarikhPergi);
    if (!d) return;
    const ymd = formatInTimeZone(d, TZ, "yyyy-MM-dd");
    if (ymd === lokasiSuggestDay) return;

    setLokasiSuggestPending(true);
    const timer = setTimeout(() => {
      listLokasiSuggestionsForDay(ymd, 8)
        .then((r) => {
          setLokasiSuggestDay(ymd);
          setLokasiSuggest(r);
        })
        .catch(() => {
          setLokasiSuggestDay(ymd);
          setLokasiSuggest([]);
        })
        .finally(() => setLokasiSuggestPending(false));
    }, 350);

    return () => clearTimeout(timer);
  }, [tarikhPergi, lokasiSuggestDay]);

  useEffect(() => {
    if (!willBookRoom || !tarikhPergi || !tarikhKembali) {
      setAvailability(emptyAvailability);
      setCheckingRoom(false);
      return;
    }

    setCheckingRoom(true);
    const timer = setTimeout(() => {
      checkPergerakanRoomAvailability({
        jenis,
        lokasi,
        tarikhPergi,
        tarikhKembali,
        sepenuhHari,
        tempahBilik: true,
        excludePergerakanId: isEdit ? editId : undefined,
      })
        .then(setAvailability)
        .catch(() =>
          setAvailability({
            ...emptyAvailability,
            applies: true,
            canBook: false,
            summary: "Gagal menyemak slot bilik. Cuba lagi.",
          }),
        )
        .finally(() => setCheckingRoom(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [willBookRoom, jenis, lokasi, tarikhPergi, tarikhKembali, sepenuhHari, isEdit, editId]);

  const hasRoomConflict = willBookRoom && availability.applies && !availability.canBook;
  const slotCount = availability.neededSlots.length;

  function applyLokasi(loc: string) {
    const resolved = resolveLokasiFields(loc, lokasiPresets);
    setLokasiSel(resolved.lokasiSel);
    setLokasiLain(resolved.lokasiLain);
  }

  function applyTemplate(t: UrusanTemplate) {
    setJenis("Pergerakan");
    setUrusan(t.urusan);
    applyLokasi(t.lokasi);
    setTarikhPergi(t.tarikhPergi);
    setTarikhKembali(t.tarikhKembali);
    if (/budiman|bestari/i.test(t.lokasi)) {
      setTempahBilik(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    setShowBilikLink(false);

    if (hasRoomConflict) {
      setError(availability.summary ?? "Slot bilik/dewan bertembung. Sila ubah tarikh atau masa.");
      return;
    }

    startTransition(async () => {
      const payload = {
        jenis,
        urusan,
        lokasi,
        tarikhPergi,
        tarikhKembali,
        sepenuhHari,
        tempahBilik: needsRoom ? tempahBilik : undefined,
      };
      const res = isEdit
        ? await updatePergerakan(editId, payload)
        : await submitPergerakan(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setShowBilikLink(Boolean(willBookRoom && res.roomSlotsBooked));
      if (isEdit) {
        setOkMsg(
          needsRoom && !tempahBilik
            ? "Rekod dikemas kini (sertai aktiviti — tiada tempahan slot baharu)."
            : needsRoom && res.roomSlotsBooked
              ? `Rekod dikemas kini. ${res.roomSlotsBooked} slot bilik/dewan diselaraskan.`
              : "Rekod dikemas kini.",
        );
        setTimeout(() => {
          router.push("/my");
          router.refresh();
        }, 800);
        return;
      }
      setOkMsg(
        jenis === "Bercuti"
          ? "Cuti direkodkan."
          : needsRoom && !tempahBilik
            ? "Pergerakan direkodkan (sertai aktiviti sedia ada — slot bilik/dewan tidak ditempah)."
            : needsRoom && res.roomSlotsBooked
              ? `Pergerakan direkodkan. ${res.roomSlotsBooked} slot bilik/dewan telah ditempah automatik.`
              : needsRoom
                ? "Pergerakan direkodkan."
                : "Pergerakan direkodkan dan akan muncul di kalendar.",
      );
      setUrusan("");
      setTarikhPergi("");
      setTarikhKembali("");
      setSepenuhHari(false);
      setTempahBilik(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 800);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <DateTimeField
          id="pergi"
          label="Tarikh & Masa Pergi"
          value={tarikhPergi}
          onChange={setTarikhPergi}
          defaultTime={DEFAULT_TIME_PERGI}
          required
        />
        <DateTimeField
          id="kembali"
          label="Tarikh & Masa Kembali"
          value={tarikhKembali}
          onChange={setTarikhKembali}
          defaultTime={DEFAULT_TIME_KEMBALI}
          required
        />
      </div>

      {urusanSuggestPending ? (
        <p className="text-xs text-slate-500">Mencari urusan digunakan pada tarikh ini…</p>
      ) : urusanSuggest.length > 0 ? (
        <div>
          <div className="text-xs font-medium text-slate-600 mb-1">
            Urusan digunakan pada tarikh ini
          </div>
          <div className="flex flex-col gap-2">
            {urusanSuggest.map((t) => (
              <button
                key={`${t.urusan}|${t.lokasi}|${t.tarikhPergi}`}
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50"
                onClick={() => applyTemplate(t)}
                title={`${t.count} rekod`}
              >
                <div className="text-sm font-semibold text-slate-900">{t.urusan}</div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {t.lokasi} · {t.count} rekod
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <div className="label">Jenis</div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="jenis"
              value="Pergerakan"
              checked={jenis === "Pergerakan"}
              onChange={() => setJenis("Pergerakan")}
            />
            Pergerakan Biasa
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="jenis"
              value="Bercuti"
              checked={jenis === "Bercuti"}
              onChange={() => setJenis("Bercuti")}
            />
            Bercuti
          </label>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="lokasi-preset">
          Lokasi
        </label>
        <select
          id="lokasi-preset"
          className="input"
          value={lokasiSel}
          onChange={(e) => setLokasiSel(e.target.value)}
        >
          {lokasiPresets.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        {isLainLain && (
          <input
            className="input mt-2"
            placeholder="Taip lokasi sendiri"
            value={lokasiLain}
            onChange={(e) => setLokasiLain(e.target.value)}
          />
        )}
        {lokasiSuggestPending ? (
          <p className="text-xs text-slate-500 mt-2">Mencari lokasi digunakan pada tarikh ini…</p>
        ) : lokasiSuggest.length > 0 ? (
          <div className="mt-2">
            <div className="text-xs font-medium text-slate-600 mb-1">
              Lokasi digunakan pada tarikh ini
            </div>
            <div className="flex flex-wrap gap-2">
              {lokasiSuggest.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  onClick={() => applyLokasi(s.label)}
                  title={`${s.count} rekod`}
                >
                  {s.label}
                  <span className="text-slate-500"> · {s.count}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {recentLokasi.length > 0 ? (
          <div className="mt-2">
            <div className="text-xs font-medium text-slate-600 mb-1">Lokasi terbaru anda</div>
            <div className="flex flex-wrap gap-2">
              {recentLokasi.slice(0, 10).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  onClick={() => applyLokasi(loc)}
                  title={loc}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <label className="label" htmlFor="urusan">
          Urusan / Aktiviti
        </label>
        <textarea
          id="urusan"
          className="input min-h-[96px]"
          required
          value={urusan}
          onChange={(e) => setUrusan(e.target.value)}
          placeholder="Contoh: Mesyuarat Pengurusan Kewangan PPD Manjung"
        />
      </div>

      {needsRoom && (
        <fieldset className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-3 space-y-2">
          <legend className="text-sm font-semibold text-slate-800 px-1">
            Bilik / Dewan
          </legend>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="tempah-bilik"
              className="mt-0.5"
              checked={tempahBilik}
              onChange={() => setTempahBilik(true)}
            />
            <span>
              <strong>Tempah bilik/dewan (penganjur)</strong>
              <span className="block text-xs text-slate-600 mt-0.5">
                Slot Pagi / Petang ditempah automatik. Hanya seorang penganjur per slot
                masa.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="tempah-bilik"
              className="mt-0.5"
              checked={!tempahBilik}
              onChange={() => setTempahBilik(false)}
            />
            <span>
              <strong>Sertai aktiviti sedia ada</strong>
              <span className="block text-xs text-slate-600 mt-0.5">
                Rekod pergerakan anda di kalendar tanpa menempah slot. Pilih ini jika
                penganjur sudah tempah {lokasi}.
              </span>
            </span>
          </label>
        </fieldset>
      )}

      {willBookRoom && (
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={sepenuhHari}
            onChange={(e) => setSepenuhHari(e.target.checked)}
          />
          <span>
            <strong>Aktiviti sepanjang hari</strong> — tempah Pagi & Petang untuk setiap tarikh
            antara pergi dan kembali (seluruh hari tidak tersedia di kalendar tempahan).
          </span>
        </label>
      )}

      {needsRoom && !tempahBilik && (
        <p className="text-sm text-brand-800 bg-brand-50 border border-brand-200 rounded-md px-3 py-2">
          Anda menyertai aktiviti di <strong>{lokasi}</strong> tanpa menempah slot. Pastikan
          penganjur telah membuat tempahan di halaman{" "}
          <Link href="/bilik" className="font-medium underline">
            Tempahan Bilik
          </Link>
          .
        </p>
      )}

      {willBookRoom && tarikhPergi && tarikhKembali && (
        <div
          className={`rounded-md border text-sm px-3 py-2 space-y-1 ${
            checkingRoom
              ? "bg-slate-50 border-slate-200 text-slate-600"
              : hasRoomConflict
                ? "bg-red-50 border-red-200 text-red-800"
                : availability.applies && slotCount > 0
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-slate-50 border-slate-200 text-slate-600"
          }`}
        >
          {checkingRoom ? (
            <p>Menyemak ketersediaan {availability.roomName ?? "bilik/dewan"}…</p>
          ) : hasRoomConflict ? (
            <>
              <p className="font-semibold">Slot bertembung — tidak boleh dihantar</p>
              <p>{availability.summary}</p>
              {availability.fullDayBlockedDates.length > 0 && (
                <ul className="list-disc list-inside text-xs mt-1">
                  {availability.fullDayBlockedDates.map((d) => (
                    <li key={d}>
                      {formatTarikhBm(d)}: sepanjang hari penuh (Pagi & Petang sudah ditempah)
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/bilik" className="inline-block text-xs font-medium underline mt-1">
                Lihat kalendar Tempahan Bilik →
              </Link>
            </>
          ) : availability.applies && slotCount > 0 ? (
            <p>
              <strong>{availability.roomName}</strong>: {slotCount} slot akan ditempah automatik
              {availability.fullDayBlockedDates.length === 0 &&
                sepenuhHari &&
                " (termasuk sepanjang hari bagi setiap tarikh)"}
              . Tiada konflik.
            </p>
          ) : availability.summary ? (
            <p>{availability.summary}</p>
          ) : null}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}
      {okMsg && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-3 py-2 space-y-2">
          <p>{okMsg}</p>
          {showBilikLink && (
            <Link href="/bilik" className="inline-block font-medium underline">
              Lihat di Tempahan Bilik →
            </Link>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        {isEdit ? (
          <Link href="/my" className="btn-secondary">
            Batal
          </Link>
        ) : (
          <button type="reset" className="btn-secondary" disabled={pending}>
            Reset
          </button>
        )}
        <button
          type="submit"
          className="btn-primary"
          disabled={pending || checkingRoom || hasRoomConflict}
        >
          {pending
            ? "Memproses..."
            : hasRoomConflict
              ? "Slot penuh"
              : isEdit
                ? "Simpan"
                : "Hantar"}
        </button>
      </div>
    </form>
  );
}
