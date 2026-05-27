import { listRooms, listBookingsInRange, listMyBookings } from "@/lib/actions/rooms";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/rbac";
import { formatInTimeZone } from "date-fns-tz";
import { addDays } from "date-fns";
import { TZ } from "@/lib/dates";
import BilikClient from "./BilikClient";

export const dynamic = "force-dynamic";

export default async function BilikPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await requireUser();
  const session = await auth();
  const isAdmin = session?.user?.peranan === "Admin"; // pentadbir bilik — batalkan tempahan orang lain
  const sp = await searchParams;
  const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
  const weekStart = sp.week && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? sp.week : today;
  const weekEnd = formatInTimeZone(
    addDays(new Date(weekStart + "T12:00:00"), 13),
    TZ,
    "yyyy-MM-dd",
  );

  const [roomList, bookings, myBookings] = await Promise.all([
    listRooms(),
    listBookingsInRange(weekStart, weekEnd),
    listMyBookings(),
  ]);

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Tempahan Bilik & Dewan</h1>
          <p className="text-sm text-slate-500">
            Bilik Budiman dan Dewan Bestari — slot <strong>Pagi (AM)</strong> dan{" "}
            <strong>Petang (PM)</strong> boleh ditempah berasingan atau{" "}
            <strong>sepanjang hari</strong> (kedua-dua slot sekali gus).
          </p>
        </div>
        {isAdmin && (
          <a
            href={`/bilik/cetak?month=${weekStart.slice(0, 7)}`}
            className="btn-secondary text-sm shrink-0"
          >
            Cetak jadual bulan
          </a>
        )}
      </div>
      <BilikClient
        rooms={roomList}
        bookings={bookings.map((b) => ({
          ...b,
          tarikh: String(b.tarikh),
        }))}
        myBookings={myBookings.map((b) => ({
          ...b,
          tarikh: String(b.tarikh),
        }))}
        weekStart={weekStart}
        isAdmin={isAdmin}
      />
    </div>
  );
}
