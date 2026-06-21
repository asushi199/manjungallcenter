-- Sokong permohonan tempahan sepanjang hari (AM+PM) sebagai satu permohonan.
-- Slot kedua dirujuk melalui booking_id_2 (null bagi tempahan satu slot).

ALTER TABLE "booking_requests"
  ADD COLUMN IF NOT EXISTS "booking_id_2" integer
  REFERENCES "room_bookings"("id") ON DELETE CASCADE;
