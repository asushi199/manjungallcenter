import { cn } from "@/lib/cn";
import {
  buildBookingLookup,
  formatDayLabelCompact,
  isWeekend,
  type MonthBookingCell,
  type RoomBookingRow,
} from "@/lib/bilik-month";

type Room = { id: number; code: string; name: string };

function CellContent({ cell }: { cell?: MonthBookingCell }) {
  if (!cell) {
    return <span className="bilik-print-empty">—</span>;
  }
  return (
    <span className="bilik-print-cell-text">
      <span className="bilik-print-cell-title">{cell.title}</span>
      <span className="bilik-print-cell-name">{cell.pegawaiNama}</span>
    </span>
  );
}

/** Satu jadual gabungan (semua bilik) — elak halaman kosong & pecah halaman semula jadual. */
export default function BilikMonthPrintTables({
  rooms,
  days,
  bookings,
}: {
  rooms: Room[];
  days: string[];
  bookings: RoomBookingRow[];
}) {
  const lookup = buildBookingLookup(bookings);

  function get(roomId: number, tarikh: string, slot: "AM" | "PM") {
    return lookup.get(`${roomId}|${tarikh}|${slot}`);
  }

  const dateColPct = 9;
  const slotColPct = (100 - dateColPct) / (rooms.length * 2);

  return (
    <div className="bilik-print-rooms">
      <table className="bilik-print-table w-full border-collapse">
        <colgroup>
          <col className="bilik-print-col-date" style={{ width: `${dateColPct}%` }} />
          {rooms.flatMap((r) => [
            <col
              key={`${r.id}-am`}
              className="bilik-print-col-slot"
              style={{ width: `${slotColPct}%` }}
            />,
            <col
              key={`${r.id}-pm`}
              className="bilik-print-col-slot"
              style={{ width: `${slotColPct}%` }}
            />,
          ])}
        </colgroup>
        <thead>
          <tr>
            <th className="bilik-print-th bilik-print-th-date" rowSpan={2}>
              Tarikh
            </th>
            {rooms.map((r) => (
              <th key={r.id} colSpan={2} className="bilik-print-th bilik-print-th-room">
                {r.name}
              </th>
            ))}
          </tr>
          <tr>
            {rooms.flatMap((r) => [
              <th key={`${r.id}-am`} className="bilik-print-th bilik-print-th-slot">
                AM
              </th>,
              <th key={`${r.id}-pm`} className="bilik-print-th bilik-print-th-slot">
                PM
              </th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {days.map((tarikh) => (
            <tr
              key={tarikh}
              className={cn(isWeekend(tarikh) && "bilik-print-row-weekend")}
            >
              <td className="bilik-print-td bilik-print-td-date whitespace-nowrap">
                {formatDayLabelCompact(tarikh)}
              </td>
              {rooms.flatMap((r) => [
                <td key={`${r.id}-${tarikh}-am`} className="bilik-print-td">
                  <CellContent cell={get(r.id, tarikh, "AM")} />
                </td>,
                <td key={`${r.id}-${tarikh}-pm`} className="bilik-print-td">
                  <CellContent cell={get(r.id, tarikh, "PM")} />
                </td>,
              ])}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
