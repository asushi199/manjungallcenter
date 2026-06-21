-- Permohonan batal / ubah tempahan bilik selepas tempoh swakhidmat 24 jam.
-- Tempahan asal kekal sehingga Admin meluluskan (lulus-dahulu, ubah-kemudian).

DO $$ BEGIN
  CREATE TYPE "booking_request_type" AS ENUM ('CANCEL', 'MODIFY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "booking_request_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "booking_requests" (
  "id" serial PRIMARY KEY,
  "booking_id" integer NOT NULL REFERENCES "room_bookings"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "type" "booking_request_type" NOT NULL,
  "status" "booking_request_status" NOT NULL DEFAULT 'PENDING',
  "new_room_id" integer REFERENCES "rooms"("id") ON DELETE SET NULL,
  "new_tarikh" date,
  "new_slot" "room_slot",
  "note" text,
  "decided_by_user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "decided_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "booking_requests_status_idx"
  ON "booking_requests" ("status");

CREATE INDEX IF NOT EXISTS "booking_requests_booking_idx"
  ON "booking_requests" ("booking_id");

-- Satu permohonan PENDING sahaja bagi setiap tempahan.
CREATE UNIQUE INDEX IF NOT EXISTS "booking_requests_pending_unique"
  ON "booking_requests" ("booking_id")
  WHERE "status" = 'PENDING';
