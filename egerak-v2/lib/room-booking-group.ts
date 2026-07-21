/**
 * Kumpulkan tempahan "saya" supaya tempahan sepanjang hari (AM+PM bagi bilik,
 * tarikh dan tajuk yang sama) dipaparkan sebagai SATU item dan boleh diubah/
 * dibatalkan sekali gus. Penyimpanan kekal dua baris; ini hanya lapisan paparan.
 */

export type MyBookingRow = {
  id: number;
  roomId: number;
  roomName: string;
  roomCode: string;
  tarikh: string;
  slot: "AM" | "PM";
  title: string;
  pegawaiNama: string;
  takwimAktivitiId?: number | null;
  createdAt: string;
  pendingType: "CANCEL" | "MODIFY" | null;
};

export type MyBookingItem = {
  /** [idAM] atau [idAM, idPM] (sepanjang hari). */
  ids: number[];
  fullDay: boolean;
  roomId: number;
  roomName: string;
  tarikh: string;
  /** "AM" | "PM" untuk satu slot; "FULL" untuk sepanjang hari. */
  slot: "AM" | "PM" | "FULL";
  title: string;
  pegawaiNama: string;
  createdAt: string;
  pendingType: "CANCEL" | "MODIFY" | null;
};

const SLOT_ORDER: Record<"AM" | "PM", number> = { AM: 0, PM: 1 };

export function isFullDayBookingPair(
  am: { title: string; pegawaiNama: string; takwimAktivitiId?: number | null },
  pm: { title: string; pegawaiNama: string; takwimAktivitiId?: number | null },
): boolean {
  const amTakwimId = am.takwimAktivitiId;
  const pmTakwimId = pm.takwimAktivitiId;

  if (amTakwimId != null || pmTakwimId != null) {
    return amTakwimId != null && amTakwimId === pmTakwimId;
  }

  return am.title === pm.title && am.pegawaiNama === pm.pegawaiNama;
}

export function groupMyBookings(rows: MyBookingRow[]): MyBookingItem[] {
  const groups = new Map<string, MyBookingRow[]>();
  for (const r of rows) {
    const key = `${r.roomId}|${r.tarikh}|${r.title}`;
    const arr = groups.get(key);
    if (arr) arr.push(r);
    else groups.set(key, [r]);
  }

  const items: MyBookingItem[] = [];
  for (const arr of groups.values()) {
    const hasAm = arr.some((r) => r.slot === "AM");
    const hasPm = arr.some((r) => r.slot === "PM");
    if (arr.length === 2 && hasAm && hasPm) {
      const sorted = [...arr].sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);
      const [am, pm] = sorted;
      if (isFullDayBookingPair(am, pm)) {
        items.push({
          ids: [am.id, pm.id],
          fullDay: true,
          roomId: am.roomId,
          roomName: am.roomName,
          tarikh: am.tarikh,
          slot: "FULL",
          title: am.title,
          pegawaiNama: am.pegawaiNama,
          createdAt: am.createdAt < pm.createdAt ? am.createdAt : pm.createdAt,
          pendingType: am.pendingType ?? pm.pendingType,
        });
        continue;
      }

      items.push(
        ...[am, pm].map((r) => ({
          ids: [r.id],
          fullDay: false,
          roomId: r.roomId,
          roomName: r.roomName,
          tarikh: r.tarikh,
          slot: r.slot,
          title: r.title,
          pegawaiNama: r.pegawaiNama,
          createdAt: r.createdAt,
          pendingType: r.pendingType,
        })),
      );
    } else {
      for (const r of arr) {
        items.push({
          ids: [r.id],
          fullDay: false,
          roomId: r.roomId,
          roomName: r.roomName,
          tarikh: r.tarikh,
          slot: r.slot,
          title: r.title,
          pegawaiNama: r.pegawaiNama,
          createdAt: r.createdAt,
          pendingType: r.pendingType,
        });
      }
    }
  }

  // Susun ikut tarikh menurun (padan dengan listMyBookings), kemudian slot.
  return items.sort((a, b) => {
    if (a.tarikh !== b.tarikh) return a.tarikh < b.tarikh ? 1 : -1;
    const sa = a.slot === "AM" ? 0 : a.slot === "FULL" ? 0 : 1;
    const sb = b.slot === "AM" ? 0 : b.slot === "FULL" ? 0 : 1;
    return sa - sb;
  });
}
