import { formatInTimeZone } from "date-fns-tz";
import BilikMonthPrintTables from "@/components/BilikMonthPrintTables";
import PpdLogo from "@/components/PpdLogo";
import { listBookingsInRange, listRooms } from "@/lib/actions/rooms";
import {
  monthRange,
  monthTitleBm,
  parseMonthParam,
  type RoomBookingRow,
} from "@/lib/bilik-month";
import { TZ } from "@/lib/dates";
import { requireAdmin } from "@/lib/rbac";
import { APP_SHORT_NAME } from "@/lib/branding";
import BilikPrintToolbar from "./BilikPrintToolbar";

export const dynamic = "force-dynamic";

export default async function BilikCetakPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const month = parseMonthParam(sp.month);
  const { start, end, days } = monthRange(month);

  const [roomList, rawBookings] = await Promise.all([
    listRooms(),
    listBookingsInRange(start, end),
  ]);

  const bookings: RoomBookingRow[] = rawBookings.map((b) => ({
    id: b.id,
    roomId: b.roomId,
    tarikh: String(b.tarikh),
    slot: b.slot,
    title: b.title,
    pegawaiNama: b.pegawaiNama,
  }));

  const printedAt = formatInTimeZone(new Date(), TZ, "dd-MM-yyyy HH:mm");
  const titleMonth = monthTitleBm(month);

  return (
    <>
      <BilikPrintToolbar month={month} />
      <article className="bilik-print mx-auto bg-white text-black shadow-sm print:shadow-none">
        <header className="bilik-print-header text-center">
          <PpdLogo width={96} className="bilik-print-logo" priority />
          <h1 className="bilik-print-title">Jadual Tempahan Bilik &amp; Dewan</h1>
          <p className="bilik-print-subtitle">Pejabat Pendidikan Daerah Manjung · {titleMonth}</p>
          <p className="bilik-print-hint">
            Termasuk Sabtu &amp; Ahad · AM = pagi · PM = petang
          </p>
        </header>

        <BilikMonthPrintTables
          rooms={roomList.map((r) => ({ id: r.id, code: r.code, name: r.name }))}
          days={days}
          bookings={bookings}
        />

        <footer className="bilik-print-footer">
          Dicetak: {printedAt} · {APP_SHORT_NAME} · {bookings.length} tempahan dalam bulan ini
        </footer>
      </article>
    </>
  );
}
