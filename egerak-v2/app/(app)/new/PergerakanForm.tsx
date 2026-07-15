"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import {
  submitPergerakan,
  updatePergerakan,
  type PergerakanEditData,
  listUrusanTemplatesForDay,
  listMyPergerakanOnDay,
  listRoomBookingCadanganForDay,
  type UrusanTemplate,
  type RoomCadangan,
  type MyDayPergerakan,
} from "@/lib/actions/pergerakan";
import { bookRoom } from "@/lib/actions/rooms";
import { attendanceKind } from "@/lib/pergerakan-slot";
import { resolveLokasiFields } from "@/lib/pergerakan-presets";
import { cn } from "@/lib/cn";
import DateTimeField from "@/components/DateTimeField";
import {
  DEFAULT_TIME_KEMBALI,
  DEFAULT_TIME_PERGI,
  combineDateAndTime,
  ensureReturnAfterDeparture,
  getReturnTimeOptions,
  splitDateTime,
  syncReturnWhenDepartChanges,
} from "@/lib/datetime-picker";
import { parseLocalInput, TZ } from "@/lib/dates";

type Props = {
  lokasiPresets: string[];
  /** Bilik untuk peta roomCode → id (butang "Tempah sekarang"). */
  rooms?: { id: number; code: string }[];
  mode?: "create" | "edit";
  editId?: number;
  initial?: PergerakanEditData;
  /** Edit: ke mana selepas Batal / Simpan (lalai /my). */
  returnTo?: string;
};

export default function PergerakanForm({
  lokasiPresets,
  rooms = [],
  mode = "create",
  editId,
  initial,
  returnTo = "/my",
}: Props) {
  const isEdit = mode === "edit" && editId != null && initial != null;
  const lokasiInit = initial
    ? resolveLokasiFields(initial.lokasi, lokasiPresets)
    : { lokasiSel: lokasiPresets[0], lokasiLain: "" };

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [urusanSuggestDay, setUrusanSuggestDay] = useState<string | null>(null);
  const [myDayRegs, setMyDayRegs] = useState<MyDayPergerakan[]>([]);
  const [myDayRegsPending, setMyDayRegsPending] = useState(false);

  const [jenis, setJenis] = useState<"Pergerakan" | "Bercuti">(initial?.jenis ?? "Pergerakan");
  const [lokasiSel, setLokasiSel] = useState(lokasiInit.lokasiSel);
  const [lokasiLain, setLokasiLain] = useState(lokasiInit.lokasiLain);
  const [urusan, setUrusan] = useState(initial?.urusan ?? "");
  const [tarikhPergi, setTarikhPergi] = useState(initial?.tarikhPergi ?? "");
  const [tarikhKembali, setTarikhKembali] = useState(initial?.tarikhKembali ?? "");
  /** Sertai aktiviti — laporan oleh penganjur lain (cipta OPR status TIADA). */
  const [tidakPerluOpr, setTidakPerluOpr] = useState(false);

  const isLainLain = lokasiSel === lokasiPresets[lokasiPresets.length - 1];
  const lokasi = isLainLain ? lokasiLain : lokasiSel;
  const roomCode =
    /budiman/i.test(lokasi) ? "BILIK_BUDIMAN" : /bestari/i.test(lokasi) ? "DEWAN_BESTARI" : null;
  const roomIdForCode = (code: "BILIK_BUDIMAN" | "DEWAN_BESTARI") =>
    rooms.find((r) => r.code === code)?.id;

  // Cadangan (peer sektor sendiri + takwim; dan tempahan bilik).
  const [cadanganLoading, setCadanganLoading] = useState(false);
  const [peerCadangan, setPeerCadangan] = useState<UrusanTemplate[]>([]);
  const [roomCadangan, setRoomCadangan] = useState<RoomCadangan[]>([]);
  const [showAllPeers, setShowAllPeers] = useState(false);
  const [urusanUnlocked, setUrusanUnlocked] = useState(false); // mode C escape (rooms with bookings)

  const tarikhPergiDate = splitDateTime(tarikhPergi).date;
  const tarikhKembaliDate = splitDateTime(tarikhKembali).date;
  const returnTimeOptions = useMemo(
    () => getReturnTimeOptions(tarikhPergi, tarikhKembaliDate || tarikhPergiDate || ""),
    [tarikhPergi, tarikhKembaliDate, tarikhPergiDate],
  );
  const defaultKembaliTime = DEFAULT_TIME_KEMBALI;

  function handleTarikhPergiChange(v: string) {
    const prevDepart = tarikhPergi;
    setTarikhPergi(v);
    setTarikhKembali((prev) => syncReturnWhenDepartChanges(prevDepart, v, prev));
  }

  function handleTarikhKembaliChange(v: string) {
    if (!tarikhPergi) {
      setTarikhKembali(v);
      return;
    }
    let next = v;
    const startDate = splitDateTime(tarikhPergi).date;
    const endDate = splitDateTime(v).date;
    if (startDate && endDate && endDate < startDate) {
      next = combineDateAndTime(startDate, splitDateTime(v).time);
    }
    setTarikhKembali(ensureReturnAfterDeparture(tarikhPergi, next));
  }

  useEffect(() => {
    if (!tarikhPergi || !tarikhKembali) return;
    const fixed = ensureReturnAfterDeparture(tarikhPergi, tarikhKembali);
    if (fixed !== tarikhKembali) setTarikhKembali(fixed);
  }, [tarikhPergi, tarikhKembali]);

  // Rekod sendiri pada hari dipilih (peringatan).
  useEffect(() => {
    if (!tarikhPergi) {
      setUrusanSuggestDay(null);
      setMyDayRegs([]);
      setMyDayRegsPending(false);
      return;
    }
    const d = parseLocalInput(tarikhPergi);
    if (!d) return;
    const ymd = formatInTimeZone(d, TZ, "yyyy-MM-dd");
    if (ymd === urusanSuggestDay) return;

    setMyDayRegsPending(true);
    const timer = setTimeout(() => {
      listMyPergerakanOnDay(ymd, isEdit ? editId : undefined)
        .then((mine) => {
          setUrusanSuggestDay(ymd);
          setMyDayRegs(mine);
        })
        .catch(() => {
          setUrusanSuggestDay(ymd);
          setMyDayRegs([]);
        })
        .finally(() => setMyDayRegsPending(false));
    }, 350);

    return () => clearTimeout(timer);
  }, [tarikhPergi, urusanSuggestDay, isEdit, editId]);

  const [cadanganRefresh, setCadanganRefresh] = useState(0);

  // Cadangan urusan (peer + tempahan bilik), keyed on tarikh + roomCode.
  useEffect(() => {
    if (jenis !== "Pergerakan" || !tarikhPergi) {
      setCadanganLoading(false);
      setPeerCadangan([]);
      setRoomCadangan([]);
      setShowAllPeers(false);
      setUrusanUnlocked(false);
      return;
    }
    const d = parseLocalInput(tarikhPergi);
    if (!d) return;
    const ymd = formatInTimeZone(d, TZ, "yyyy-MM-dd");

    let cancelled = false;
    setCadanganLoading(true);
    const timer = setTimeout(() => {
      Promise.all([
        listUrusanTemplatesForDay(ymd),
        roomCode ? listRoomBookingCadanganForDay(roomCode, ymd) : Promise.resolve([]),
      ])
        .then(([peers, room]) => {
          if (cancelled) return;
          setPeerCadangan(peers);
          setRoomCadangan(room);
        })
        .catch(() => {
          if (cancelled) return;
          setPeerCadangan([]);
          setRoomCadangan([]);
        })
        .finally(() => {
          if (cancelled) return;
          setCadanganLoading(false);
          setShowAllPeers(false);
          setUrusanUnlocked(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jenis, tarikhPergi, roomCode, cadanganRefresh]);

  // Gate state.
  const hasRoomBookings = roomCadangan.length > 0;
  const roomNoBooking = roomCode != null && !cadanganLoading && !hasRoomBookings;
  // Mode C hanya untuk bilik YANG ada tempahan: mesti pilih atau tanda "tiada dalam senarai".
  const modeCActive = roomCode != null && hasRoomBookings && !urusanUnlocked;
  // Hanya mode C mengunci urusan. Cadangan yang sedang dimuat tidak pernah menyekat taip —
  // ia bantuan, bukan laluan utama.
  const urusanDisabled = !isEdit && modeCActive;

  const attended = (() => {
    const p = parseLocalInput(tarikhPergi);
    const k = parseLocalInput(tarikhKembali);
    const day = p ? formatInTimeZone(p, TZ, "yyyy-MM-dd") : null;
    return p && k && day ? attendanceKind(p, k, day) : "NONE";
  })();

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
  }

  function onBookNow() {
    if (!roomCode || !urusan.trim()) return;
    const roomId = roomIdForCode(roomCode);
    if (roomId == null) {
      setError("Bilik tidak dijumpai. Sila tempah di Tempahan Bilik.");
      return;
    }
    const p = parseLocalInput(tarikhPergi);
    const day = p ? formatInTimeZone(p, TZ, "yyyy-MM-dd") : null;
    if (!day) return;
    const kind = attended; // "AM" | "PM" | "FULL" | "NONE"
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      try {
        const res = await bookRoom({
          roomId,
          tarikh: day,
          title: urusan.trim(),
          fullDay: kind === "FULL",
          slot: kind === "PM" ? "PM" : "AM",
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        // muat semula cadangan supaya tempahan baharu muncul & mode C aktif
        setOkMsg("Tempahan bilik dibuat.");
        setCadanganRefresh((n) => n + 1);
        router.refresh();
      } catch {
        setError("Gagal membuat tempahan. Sila cuba lagi.");
      }
    });
  }

  function handleReset() {
    setJenis(initial?.jenis ?? "Pergerakan");
    setLokasiSel(lokasiInit.lokasiSel);
    setLokasiLain(lokasiInit.lokasiLain);
    setUrusan("");
    setTarikhPergi("");
    setTarikhKembali("");
    setTidakPerluOpr(false);
    setError(null);
    setOkMsg(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);

    startTransition(async () => {
      const payload = {
        jenis,
        urusan,
        lokasi,
        tarikhPergi,
        tarikhKembali,
        tidakPerluOpr: jenis === "Pergerakan" ? tidakPerluOpr : undefined,
      };
      try {
        const res = isEdit
          ? await updatePergerakan(editId, payload)
          : await submitPergerakan(payload);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        if (isEdit) {
          setOkMsg("Rekod dikemas kini.");
          setTimeout(() => {
            router.push(returnTo);
            router.refresh();
          }, 800);
          return;
        }
        setOkMsg(
          jenis === "Bercuti"
            ? "Cuti direkodkan."
            : "Pergerakan direkodkan dan akan muncul di kalendar.",
        );
        setUrusan("");
        setTarikhPergi("");
        setTarikhKembali("");
        setTidakPerluOpr(false);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 800);
      } catch {
        setError("Gagal menyimpan rekod. Sila cuba lagi.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <DateTimeField
          id="pergi"
          label="Tarikh & Masa Pergi"
          value={tarikhPergi}
          onChange={handleTarikhPergiChange}
          defaultTime={DEFAULT_TIME_PERGI}
          required
        />
        <DateTimeField
          id="kembali"
          label="Tarikh & Masa Kembali"
          value={tarikhKembali}
          onChange={handleTarikhKembaliChange}
          defaultTime={defaultKembaliTime}
          minDate={tarikhPergiDate || undefined}
          timeOptions={returnTimeOptions}
          required
        />
      </div>

      {myDayRegsPending ? null : myDayRegs.length > 0 ? (
        <div
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm"
          role="status"
        >
          <p className="font-medium text-amber-900">
            Anda sudah ada {myDayRegs.length} rekod pada tarikh ini
          </p>
          <p className="text-xs text-amber-800 mt-1">
            Anda masih boleh daftar aktiviti lain pada hari yang sama.
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-amber-900">
            {myDayRegs.map((r) => (
              <li key={r.id} className="rounded bg-white/70 border border-amber-100 px-2 py-1.5">
                <span className="font-medium">{r.urusan}</span>
                {r.lokasi ? (
                  <span className="text-amber-800"> · {r.lokasi}</span>
                ) : null}
                <span className="block text-[11px] text-amber-700 mt-0.5">
                  {r.tarikhPergiLabel} – {r.tarikhKembaliLabel}
                  {r.jenis === "Bercuti" ? " · Bercuti" : ""}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/my"
            className="inline-block mt-2 text-xs font-medium text-amber-900 underline"
          >
            Lihat semua rekod saya →
          </Link>
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
      </div>

      {jenis === "Pergerakan" && (
        <label className="flex items-start gap-2 text-sm cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={tidakPerluOpr}
            onChange={(e) => setTidakPerluOpr(e.target.checked)}
          />
          <span>
            <strong>Tidak perlu tulis OPR</strong>
            <span className="block text-xs text-slate-600 mt-0.5">
              OPR aktiviti ini ditulis oleh orang lain (penganjur atau rakan yang turut hadir).
            </span>
          </span>
        </label>
      )}

      {jenis === "Pergerakan" && cadanganLoading && (
        <p className="text-xs text-slate-500">Mencari aktiviti hari ini…</p>
      )}

      {/* Budiman/Bestari WITH bookings → mode C list */}
      {roomCode && hasRoomBookings && (
        <div className="rounded-md border border-brand-200 bg-brand-50/60 p-3 space-y-2">
          <p className="text-xs font-medium text-brand-900">
            Pilih aktiviti tempahan bilik ini (nama diseragamkan):
          </p>
          {roomCadangan.map((c) => {
            const highlight =
              c.kind === "FULL" || attended === "FULL" || attended === c.kind;
            return (
              <button
                key={`${c.kind}-${c.title}`}
                type="button"
                onClick={() => {
                  setUrusan(c.title);
                }}
                className={cn(
                  "block w-full text-left rounded-md border px-3 py-2 text-sm",
                  urusan === c.title ? "border-brand-500 bg-white" : "border-slate-200 bg-white",
                  highlight ? "" : "opacity-60",
                )}
              >
                <span className="font-semibold">{c.title}</span>
                <span className="ml-2 text-xs text-slate-500">
                  {c.kind === "FULL" ? "Sepanjang hari" : c.kind === "AM" ? "Pagi" : "Petang"}
                </span>
              </button>
            );
          })}
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={urusanUnlocked}
              onChange={(e) => setUrusanUnlocked(e.target.checked)}
            />
            Aktiviti tiada dalam senarai (taip sendiri)
          </label>
        </div>
      )}

      {/* Budiman/Bestari WITHOUT booking → lenient reminder + book-now */}
      {roomNoBooking && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 space-y-2">
          <p>
            Bilik ini tiada tempahan rasmi pada hari ini. Jika aktiviti rasmi, sila tempah di
            Tempahan Bilik.
          </p>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={pending || !urusan.trim() || attended === "NONE"}
            onClick={onBookNow}
          >
            Tempah sekarang
          </button>
        </div>
      )}

      {/* Peer cadangan (other locations, and the no-booking room fallback) */}
      {jenis === "Pergerakan" &&
        !cadanganLoading &&
        !hasRoomBookings &&
        peerCadangan.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-700">Cadangan urusan hari ini:</p>
            <div className="flex flex-col gap-2">
              {(showAllPeers ? peerCadangan : peerCadangan.slice(0, 3)).map((t) => (
                <button
                  key={`${t.urusan}|${t.lokasi}|${t.tarikhPergi}`}
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50"
                  onClick={() => applyTemplate(t)}
                >
                  <div className="text-sm font-semibold text-slate-900">{t.urusan}</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {t.lokasi} · {t.count} rekod
                  </div>
                </button>
              ))}
            </div>
            {peerCadangan.length > 3 && !showAllPeers && (
              <button
                type="button"
                className="text-xs underline text-slate-600"
                onClick={() => setShowAllPeers(true)}
              >
                Lihat lagi ({peerCadangan.length - 3})
              </button>
            )}
          </div>
        )}

      <div>
        <label className="label" htmlFor="urusan">
          Urusan / Aktiviti
        </label>
        <textarea
          id="urusan"
          className="input min-h-[96px]"
          required
          disabled={urusanDisabled}
          value={urusan}
          onChange={(e) => setUrusan(e.target.value)}
          placeholder={
            urusanDisabled
              ? "Pilih aktiviti tempahan bilik di atas, atau tanda “tiada dalam senarai”."
              : "Contoh: Mesyuarat Pengurusan Kewangan PPD Manjung"
          }
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}
      {okMsg && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-3 py-2 space-y-2">
          <p>{okMsg}</p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {isEdit ? (
          <Link href={returnTo} className="btn-secondary">
            Batal
          </Link>
        ) : (
          <button type="button" className="btn-secondary" disabled={pending} onClick={handleReset}>
            Reset
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Memproses..." : isEdit ? "Simpan" : "Hantar"}
        </button>
      </div>
    </form>
  );
}
