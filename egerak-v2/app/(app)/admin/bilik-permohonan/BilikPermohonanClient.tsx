"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideBookingRequest } from "@/lib/actions/rooms";

const SLOT_SHORT: Record<"AM" | "PM", string> = { AM: "Pagi", PM: "Petang" };

type Req = {
  requestId: number;
  type: "CANCEL" | "MODIFY";
  createdAt: string;
  pemohonNama: string;
  bookingId: number;
  bookingId2: number | null;
  title: string;
  currentRoomName: string;
  currentTarikh: string;
  currentSlot: "AM" | "PM";
  newRoomName: string | null;
  newTarikh: string | null;
  newSlot: "AM" | "PM" | null;
};

function slotLabel(slot: "AM" | "PM" | null, fullDay: boolean): string {
  if (fullDay) return "Sepanjang hari";
  return slot ? SLOT_SHORT[slot] : "";
}

export default function BilikPermohonanClient({ requests }: { requests: Req[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);

  function decide(requestId: number, decision: "APPROVE" | "REJECT") {
    const verb = decision === "APPROVE" ? "Luluskan" : "Tolak";
    if (!confirm(`${verb} permohonan ini?`)) return;
    setBusyId(requestId);
    startTransition(async () => {
      const res = await decideBookingRequest(requestId, decision);
      setBusyId(null);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (requests.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-slate-500">
        Tiada permohonan menunggu kelulusan.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {requests.map((r) => (
        <li key={r.requestId} className="card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={
                "rounded-full px-2.5 py-1 text-xs font-medium " +
                (r.type === "CANCEL"
                  ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800")
              }
            >
              {r.type === "CANCEL" ? "Mohon batal" : "Mohon ubah"}
            </span>
            <span className="text-xs text-slate-500">Pemohon: {r.pemohonNama}</span>
          </div>

          <div className="text-sm">
            <div className="font-medium">{r.title}</div>
            <div className="mt-1 text-slate-700">
              <span className="text-slate-500">Sekarang: </span>
              <strong>{r.currentRoomName}</strong> · {r.currentTarikh} ·{" "}
              {slotLabel(r.currentSlot, r.bookingId2 != null)}
            </div>
            {r.type === "MODIFY" && (
              <div className="mt-0.5 text-emerald-800">
                <span className="text-slate-500">Tukar ke: </span>
                <strong>{r.newRoomName ?? r.currentRoomName}</strong> · {r.newTarikh} ·{" "}
                {slotLabel(r.newSlot, r.newSlot == null)}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={pending}
              onClick={() => decide(r.requestId, "REJECT")}
            >
              {busyId === r.requestId && pending ? "…" : "Tolak"}
            </button>
            <button
              type="button"
              className="btn-primary text-xs"
              disabled={pending}
              onClick={() => decide(r.requestId, "APPROVE")}
            >
              {busyId === r.requestId && pending ? "…" : "Luluskan"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
