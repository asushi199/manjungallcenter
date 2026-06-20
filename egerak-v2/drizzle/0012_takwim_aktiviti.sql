CREATE TABLE IF NOT EXISTS "takwim_aktiviti" (
  "id" serial PRIMARY KEY,
  "sektor_id" integer REFERENCES "sektors"("id") ON DELETE SET NULL,
  "urusan" text NOT NULL,
  "lokasi" text NOT NULL DEFAULT '',
  "tarikh_pergi" timestamp with time zone NOT NULL,
  "tarikh_kembali" timestamp with time zone NOT NULL,
  "kategori" text NOT NULL DEFAULT 'rancangan',
  "owner_user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "import_batch_id" integer REFERENCES "import_batches"("id") ON DELETE SET NULL,
  "created_by_user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "aktif" boolean NOT NULL DEFAULT true,
  "source_pergerakan_id" integer REFERENCES "pergerakan"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "takwim_aktiviti_kategori_check" CHECK ("kategori" IN ('rancangan', 'tambahan'))
);

CREATE INDEX IF NOT EXISTS "takwim_aktiviti_sektor_idx"
  ON "takwim_aktiviti" ("sektor_id");

CREATE INDEX IF NOT EXISTS "takwim_aktiviti_owner_idx"
  ON "takwim_aktiviti" ("owner_user_id");

CREATE INDEX IF NOT EXISTS "takwim_aktiviti_aktif_range_idx"
  ON "takwim_aktiviti" ("aktif", "tarikh_kembali", "tarikh_pergi")
  WHERE "aktif" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "takwim_aktiviti_source_pergerakan_idx"
  ON "takwim_aktiviti" ("source_pergerakan_id");

ALTER TABLE "pergerakan"
  ADD COLUMN IF NOT EXISTS "takwim_aktiviti_id" integer REFERENCES "takwim_aktiviti"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "role_dalam_takwim" text;

CREATE INDEX IF NOT EXISTS "pergerakan_takwim_aktiviti_idx"
  ON "pergerakan" ("takwim_aktiviti_id");

ALTER TABLE "room_bookings"
  ADD COLUMN IF NOT EXISTS "takwim_aktiviti_id" integer REFERENCES "takwim_aktiviti"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "room_bookings_takwim_aktiviti_idx"
  ON "room_bookings" ("takwim_aktiviti_id");

INSERT INTO "takwim_aktiviti" (
  "sektor_id",
  "urusan",
  "lokasi",
  "tarikh_pergi",
  "tarikh_kembali",
  "kategori",
  "owner_user_id",
  "created_by_user_id",
  "aktif",
  "source_pergerakan_id",
  "created_at",
  "updated_at"
)
SELECT
  p."sektor_id",
  p."urusan",
  p."lokasi",
  p."tarikh_pergi",
  p."tarikh_kembali",
  CASE WHEN p."takwim_kategori" = 'tambahan' THEN 'tambahan' ELSE 'rancangan' END,
  p."user_id",
  p."user_id",
  p."aktif",
  p."id",
  p."created_at",
  p."updated_at"
FROM "pergerakan" p
WHERE p."jenis" = 'Pergerakan'
  AND (p."source" = 'bulk' OR p."takwim_kategori" = 'tambahan')
  AND NOT EXISTS (
    SELECT 1
    FROM "takwim_aktiviti" ta
    WHERE ta."source_pergerakan_id" = p."id"
  );

UPDATE "pergerakan" p
SET
  "takwim_aktiviti_id" = ta."id",
  "role_dalam_takwim" = 'owner'
FROM "takwim_aktiviti" ta
WHERE ta."source_pergerakan_id" = p."id"
  AND p."takwim_aktiviti_id" IS NULL;

UPDATE "room_bookings" rb
SET "takwim_aktiviti_id" = p."takwim_aktiviti_id"
FROM "pergerakan" p
WHERE rb."pergerakan_id" = p."id"
  AND p."takwim_aktiviti_id" IS NOT NULL
  AND rb."takwim_aktiviti_id" IS NULL;
