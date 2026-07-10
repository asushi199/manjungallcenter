"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, format, parseISO } from "date-fns";
import { bookRoom, cancelBooking, modifyBooking, cancelBookingsBulk } from "@/lib/actions/rooms";
import { SLOT_LABEL } from "@/lib/room-slots";
import { isWithinGrace } from "@/lib/room-booking-policy";
import type { MyBookingItem } from "@/lib/room-booking-group";
import { replaceWithSearchParams } from "@/lib/navigate";
import { cn } from "@/lib/cn";

const SLOT_SHORT: Record<"AM" | "PM" | "FULL", string> = {
  AM: "Pagi",
  PM: "Petang",
  FULL: "Sepanjang hari",
};

type Room = { id: number; code: string; name: string };
type Booking = {
  id: number;
  roomId: number;
  roomCode: string;
  roomName: string;
  tarikh: string;
  slot: "AM" | "PM";
  title: string;
  pegawaiNama: string;
};
type MyBooking = MyBookingItem;

function BookingCell({ booking }: { booking: Booking }) {
  const tip = `${booking.title} — ${booking.pegawaiNama}`;
  return (
    <div
      className="rounded px-1 py-1 bg-red-100 text-red-900 text-[10px] leading-tight"
      title={tip}
    >
      <div className="font-semibold line-clamp-2">{booking.title}</div>
      <div className="truncate opacity-90">{booking.pegawaiNama}</div>
    </div>
  );
}

const SLOTS: Array<"AM" | "PM"> = ["AM", "PM"];

/** md breakpoint — desktop shows all rooms; mobile one room + tabs */
function useIsMdUp() {
  const [mdUp, setMdUp] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setMdUp(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return mdUp;
}

export default function BilikClient({
  rooms,
  bookings,
  myBookings,
  weekStart,
  isAdmin,
}: {
  rooms: Room[];
  bookings: Booking[];
  myBookings: MyBooking[];
  weekStart: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const mdUp = useIsMdUp();
  const weekPickerRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [roomFocus, setRoomFocus] = useState(rooms[0]?.id ?? 0);
  const [selectedBookings, setSelectedBookings] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    roomId: rooms[0]?.id ?? 0,
    tarikh: weekStart,
    slot: "AM" as "AM" | "PM",
    title: "",
    fullDay: false,
  });

  const days = Array.from({ length: 14 }, (_, i) =>
    format(addDays(parseISO(weekStart), i), "yyyy-MM-dd"),
  );

  function bookingKey(roomId: number, tarikh: string, slot: "AM" | "PM") {
    return bookings.find(
      (b) => b.roomId === roomId && b.tarikh === tarikh && b.slot === slot,
    );
  }

  function onBook(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await bookRoom(form);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setMsg(
        res.slotsBooked === 2
          ? "Tempahan berjaya — Pagi & Petang (sepanjang hari)."
          : "Tempahan berjaya.",
      );
      setForm((f) => ({ ...f, title: "", fullDay: false }));
      router.refresh();
    });
  }

  function onCancel(b: MyBooking) {
    const selfService = isWithinGrace(b.createdAt);
    const prompt = selfService
      ? "Batalkan tempahan ini?"
      : "Tempahan ini melepasi 24 jam. Hantar permohonan batal kepada Admin?";
    if (!confirm(prompt)) return;
    startTransition(async () => {
      const res = await cancelBooking(b.ids);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      alert(
        res.mode === "requested"
          ? "Permohonan batal dihantar. Menunggu kelulusan Admin."
          : "Tempahan dibatalkan.",
      );
      router.refresh();
    });
  }

  function onModify(
    ids: number[],
    target: { roomId: number; tarikh: string; slot?: "AM" | "PM"; fullDay?: boolean },
  ) {
    startTransition(async () => {
      const res = await modifyBooking({ bookingIds: ids, ...target });
      if (!res.ok) {
        alert(res.error);
        return;
      }
      alert(
        res.mode === "requested"
          ? "Permohonan ubah dihantar. Tempahan asal kekal sehingga Admin meluluskan."
          : "Tempahan dikemas kini.",
      );
      setEditingId(null);
      router.refresh();
    });
  }

  function shiftWeek(delta: number) {
    const next = format(addDays(parseISO(weekStart), delta * 7), "yyyy-MM-dd");
    replaceWithSearchParams(router, "/bilik", new URLSearchParams({ week: next }));
  }

  function jumpToDate(tarikh: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tarikh)) return;
    replaceWithSearchParams(router, "/bilik", new URLSearchParams({ week: tarikh }));
  }

  /** Desktop: jadual semua bilik sebelah-menyebelah; telefon: satu bilik + tab */
  const tableRooms =
    rooms.length > 1 && !mdUp ? rooms.filter((r) => r.id === roomFocus) : rooms;

  function toggleBooking(id: number) {
    const next = new Set(selectedBookings);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedBookings(next);
  }

  function onBulkCancelBookings() {
    if (selectedBookings.size === 0) return;
    if (!confirm(`Batalkan ${selectedBookings.size} tempahan?`)) return;
    startTransition(async () => {
      const r = await cancelBookingsBulk([...selectedBookings]);
      if (r.error) alert(r.error);
      else alert(`${r.cancelled} tempahan dibatalkan.`);
      setSelectedBookings(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <details className="card group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
          <h2 className="font-semibold">Tempahan Baharu</h2>
          <span
            className="shrink-0 text-slate-400 text-sm transition-transform group-open:rotate-180"
            aria-hidden
          >
            ▼
          </span>
        </summary>
        <div className="border-t px-4 pb-4 pt-3">
        <form onSubmit={onBook} className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Bilik / Dewan</label>
            <select
              className="input"
              value={form.roomId}
              onChange={(e) => {
                const roomId = Number(e.target.value);
                setForm({ ...form, roomId });
                setRoomFocus(roomId);
              }}
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tarikh</label>
            <input
              type="date"
              className="input"
              required
              value={form.tarikh}
              onChange={(e) => setForm({ ...form, tarikh: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Slot</label>
            <select
              className="input"
              value={form.slot}
              disabled={form.fullDay}
              onChange={(e) => setForm({ ...form, slot: e.target.value as "AM" | "PM" })}
            >
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {SLOT_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.fullDay}
                onChange={(e) => setForm({ ...form, fullDay: e.target.checked })}
              />
              <span>
                <strong>Aktiviti sepanjang hari</strong>
                <span className="block text-xs text-slate-600 mt-0.5">
                  Tempah Pagi & Petang untuk tarikh ini (seluruh hari tidak tersedia di
                  kalendar).
                </span>
              </span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Tajuk aktiviti</label>
            <input
              className="input"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Contoh: Mesyuarat panitia"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Memproses…" : "Tempah"}
            </button>
          </div>
        </form>
        {msg && <p className="text-sm mt-2 text-brand-700">{msg}</p>}
        </div>
      </details>

      <div className="card p-3 sm:p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="relative flex justify-center sm:order-2 sm:flex-1 sm:px-2">
          <button
            type="button"
            className="text-sm font-medium text-slate-700 leading-snug rounded-md px-2 py-1 -my-1 hover:bg-slate-100 hover:text-brand-700 transition-colors cursor-pointer"
            aria-label="Pilih tarikh untuk lompat ke jadual"
            onClick={() => {
              const el = weekPickerRef.current;
              if (!el) return;
              try {
                el.showPicker();
              } catch {
                el.focus();
                el.click();
              }
            }}
          >
            <span className="sm:hidden">
              {format(parseISO(weekStart), "d MMM")} –{" "}
              {format(addDays(parseISO(weekStart), 13), "d MMM yyyy")}
            </span>
            <span className="hidden sm:inline">
              {format(parseISO(weekStart), "dd MMM yyyy")} —{" "}
              {format(addDays(parseISO(weekStart), 13), "dd MMM yyyy")}
            </span>
          </button>
          <input
            ref={weekPickerRef}
            type="date"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            value={weekStart}
            onChange={(e) => jumpToDate(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3 sm:mt-0 sm:contents">
          <button
            type="button"
            className="btn-secondary w-full justify-center text-sm py-2.5 whitespace-nowrap sm:order-1 sm:w-auto sm:min-w-[8.5rem]"
            onClick={() => shiftWeek(-1)}
          >
            ← Minggu lepas
          </button>
          <button
            type="button"
            className="btn-secondary w-full justify-center text-sm py-2.5 whitespace-nowrap sm:order-3 sm:w-auto sm:min-w-[8.5rem]"
            onClick={() => shiftWeek(1)}
          >
            Minggu depan →
          </button>
        </div>
      </div>

      {rooms.length > 1 && !mdUp && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 w-full">Pilih bilik / dewan (jadual):</span>
          {rooms.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRoomFocus(r.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium border",
                roomFocus === r.id
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "bg-white border-slate-300 text-slate-700",
              )}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full table-fixed text-xs md:min-w-[640px]">
          <colgroup>
            <col style={{ width: "4.5rem" }} />
            {tableRooms.map((r) =>
              SLOTS.map((s) => <col key={`col-${r.id}-${s}`} style={{ width: "8.5rem" }} />),
            )}
          </colgroup>
          <thead>
            <tr className="bg-slate-50">
              <th className="p-2 text-left">Tarikh</th>
              {tableRooms.map((r) => (
                <th key={r.id} colSpan={2} className="p-2 text-center border-l">
                  {r.name}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50/80">
              <th />
              {tableRooms.map((r) =>
                SLOTS.map((s) => (
                  <th key={`${r.id}-${s}`} className="p-1 font-normal text-slate-500 border-l">
                    {s}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d} className="border-t">
                <td className="p-2 whitespace-nowrap font-medium">{format(parseISO(d), "dd/MM")}</td>
                {tableRooms.map((r) => {
                  const am = bookingKey(r.id, d, "AM");
                  const pm = bookingKey(r.id, d, "PM");
                  if (am && pm) {
                    const sameOfficer = am.pegawaiNama === pm.pegawaiNama;
                    const tip = sameOfficer
                      ? `${am.title} / ${pm.title} — ${am.pegawaiNama}`
                      : `${am.title} (${am.pegawaiNama}) · ${pm.title} (${pm.pegawaiNama})`;
                    return (
                      <td
                        key={`${r.id}-${d}-full`}
                        colSpan={2}
                        className="p-1 border-l align-top overflow-hidden"
                      >
                        <div
                          className="rounded px-2 py-2 bg-red-200 text-red-950 text-[10px] leading-tight min-h-[2.5rem]"
                          title={tip}
                        >
                          <div className="font-bold text-[9px] uppercase tracking-wide">
                            Penuh hari
                          </div>
                          <div className="font-semibold line-clamp-2">
                            {am.title === pm.title ? am.title : `${am.title} / ${pm.title}`}
                          </div>
                          <div className="truncate opacity-90">
                            {sameOfficer ? am.pegawaiNama : `${am.pegawaiNama} · ${pm.pegawaiNama}`}
                          </div>
                        </div>
                      </td>
                    );
                  }
                  return SLOTS.map((s) => {
                    const b = s === "AM" ? am : pm;
                    return (
                      <td
                        key={`${r.id}-${d}-${s}`}
                        className="p-1 border-l align-top overflow-hidden"
                      >
                        {b ? (
                          <BookingCell booking={b} />
                        ) : (
                          <div className="rounded px-1 py-2 bg-emerald-50 text-emerald-800 text-center text-[10px]">
                            Kosong
                          </div>
                        )}
                      </td>
                    );
                  });
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && bookings.length > 0 && (
        <div className="card p-4 space-y-2">
          <h2 className="font-semibold">Admin — batalkan tempahan (minggu ini)</h2>
          <p className="text-xs text-slate-500">
            Tandakan tempahan ujian, kemudian batalkan sekali gus.
          </p>
          <ul className="max-h-48 overflow-y-auto divide-y text-sm border rounded-md">
            {bookings.map((b) => (
              <li key={b.id} className="flex items-center gap-2 px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={selectedBookings.has(b.id)}
                  onChange={() => toggleBooking(b.id)}
                />
                <span>
                  {b.tarikh} {b.slot} · <strong>{b.roomName}</strong> — {b.title} (
                  {b.pegawaiNama})
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn-danger"
            disabled={selectedBookings.size === 0 || pending}
            onClick={onBulkCancelBookings}
          >
            Batalkan dipilih ({selectedBookings.size})
          </button>
        </div>
      )}

      <div className="card p-4">
        <h2 className="font-semibold mb-1">Tempahan Saya</h2>
        <p className="text-xs text-slate-500 mb-2">
          Dalam <strong>24 jam</strong> selepas tempah, anda boleh ubah atau batal sendiri.
          Selepas itu, ubah/batal perlu kelulusan Admin (tempahan asal kekal sehingga
          diluluskan).
        </p>
        {myBookings.length === 0 ? (
          <p className="text-sm text-slate-500">Tiada tempahan aktif.</p>
        ) : (
          <ul className="divide-y text-sm">
            {myBookings.map((b) => {
              const key = b.ids.join("-");
              return (
                <li key={key} className="py-2 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong>{b.roomName}</strong> · {b.tarikh} · {SLOT_SHORT[b.slot]} — {b.title}
                      <span className="text-slate-500"> ({b.pegawaiNama})</span>
                    </span>
                    {b.pendingType ? (
                      <span className="rounded-full bg-amber-100 text-amber-800 text-xs px-2.5 py-1 whitespace-nowrap">
                        {b.pendingType === "CANCEL" ? "Mohon batal" : "Mohon ubah"} — menunggu Admin
                      </span>
                    ) : (
                      <span className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          disabled={pending}
                          onClick={() => setEditingId(editingId === key ? null : key)}
                        >
                          {isWithinGrace(b.createdAt) ? "Ubah" : "Mohon ubah"}
                        </button>
                        <button
                          type="button"
                          className="btn-danger text-xs"
                          disabled={pending}
                          onClick={() => onCancel(b)}
                        >
                          {isWithinGrace(b.createdAt) ? "Batal" : "Mohon batal"}
                        </button>
                      </span>
                    )}
                  </div>
                  {editingId === key && !b.pendingType && (
                    <ModifyEditor
                      booking={b}
                      rooms={rooms}
                      pending={pending}
                      selfService={isWithinGrace(b.createdAt)}
                      onCancel={() => setEditingId(null)}
                      onSubmit={(target) => onModify(b.ids, target)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ModifyEditor({
  booking,
  rooms,
  pending,
  selfService,
  onCancel,
  onSubmit,
}: {
  booking: MyBooking;
  rooms: Room[];
  pending: boolean;
  selfService: boolean;
  onCancel: () => void;
  onSubmit: (target: {
    roomId: number;
    tarikh: string;
    slot?: "AM" | "PM";
    fullDay?: boolean;
  }) => void;
}) {
  const [roomId, setRoomId] = useState(booking.roomId);
  const [tarikh, setTarikh] = useState(booking.tarikh);
  const [mode, setMode] = useState<"AM" | "PM" | "FULL">(booking.slot);
  const unchanged =
    roomId === booking.roomId && tarikh === booking.tarikh && mode === booking.slot;

  return (
    <div className="rounded-md border bg-slate-50 p-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Bilik / Dewan</label>
          <select className="input" value={roomId} onChange={(e) => setRoomId(Number(e.target.value))}>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Tarikh</label>
          <input
            type="date"
            className="input"
            value={tarikh}
            onChange={(e) => setTarikh(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Slot</label>
          <select
            className="input"
            value={mode}
            onChange={(e) => setMode(e.target.value as "AM" | "PM" | "FULL")}
          >
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {SLOT_LABEL[s]}
              </option>
            ))}
            <option value="FULL">Sepanjang hari (Pagi &amp; Petang)</option>
          </select>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button type="button" className="btn-secondary text-xs" onClick={onCancel} disabled={pending}>
          Batal
        </button>
        <button
          type="button"
          className="btn-primary text-xs"
          disabled={pending || unchanged}
          onClick={() =>
            onSubmit(
              mode === "FULL"
                ? { roomId, tarikh, fullDay: true }
                : { roomId, tarikh, slot: mode },
            )
          }
        >
          {selfService ? "Simpan ubah" : "Hantar permohonan ubah"}
        </button>
      </div>
    </div>
  );
}
