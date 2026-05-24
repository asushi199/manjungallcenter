"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, format, parseISO } from "date-fns";
import { bookRoom, cancelBooking } from "@/lib/actions/rooms";
import { SLOT_LABEL } from "@/lib/room-slots";

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
type MyBooking = {
  id: number;
  roomName: string;
  tarikh: string;
  slot: "AM" | "PM";
  title: string;
  pegawaiNama: string;
};

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

export default function BilikClient({
  rooms,
  bookings,
  myBookings,
  weekStart,
}: {
  rooms: Room[];
  bookings: Booking[];
  myBookings: MyBooking[];
  weekStart: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    roomId: rooms[0]?.id ?? 0,
    tarikh: weekStart,
    slot: "AM" as "AM" | "PM",
    title: "",
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
      setMsg("Tempahan berjaya.");
      setForm((f) => ({ ...f, title: "" }));
      router.refresh();
    });
  }

  function onCancel(id: number) {
    if (!confirm("Batalkan tempahan ini?")) return;
    startTransition(async () => {
      const res = await cancelBooking(id);
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  }

  function shiftWeek(delta: number) {
    const next = format(addDays(parseISO(weekStart), delta * 7), "yyyy-MM-dd");
    router.replace(`/bilik?week=${next}`);
  }

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <h2 className="font-semibold mb-3">Tempahan Baharu</h2>
        <form onSubmit={onBook} className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Bilik / Dewan</label>
            <select
              className="input"
              value={form.roomId}
              onChange={(e) => setForm({ ...form, roomId: Number(e.target.value) })}
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

      <div className="flex items-center justify-between">
        <button type="button" className="btn-secondary" onClick={() => shiftWeek(-1)}>
          ← Minggu lepas
        </button>
        <span className="text-sm text-slate-600">
          {format(parseISO(weekStart), "dd MMM yyyy")} —{" "}
          {format(addDays(parseISO(weekStart), 13), "dd MMM yyyy")}
        </span>
        <button type="button" className="btn-secondary" onClick={() => shiftWeek(1)}>
          Minggu depan →
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-2 text-left">Tarikh</th>
              {rooms.map((r) => (
                <th key={r.id} colSpan={2} className="p-2 text-center border-l">
                  {r.name}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50/80">
              <th />
              {rooms.map((r) =>
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
                {rooms.map((r) => {
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
                        className="p-1 border-l align-top"
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
                      <td key={`${r.id}-${d}-${s}`} className="p-1 border-l align-top">
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

      <div className="card p-4">
        <h2 className="font-semibold mb-2">Tempahan Saya</h2>
        {myBookings.length === 0 ? (
          <p className="text-sm text-slate-500">Tiada tempahan aktif.</p>
        ) : (
          <ul className="divide-y text-sm">
            {myBookings.map((b) => (
              <li key={b.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>{b.roomName}</strong> · {b.tarikh} · {b.slot} — {b.title}
                  <span className="text-slate-500"> ({b.pegawaiNama})</span>
                </span>
                <button
                  type="button"
                  className="btn-danger text-xs"
                  disabled={pending}
                  onClick={() => onCancel(b.id)}
                >
                  Batal
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
