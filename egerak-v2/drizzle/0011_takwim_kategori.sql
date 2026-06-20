ALTER TABLE "pergerakan" ADD COLUMN IF NOT EXISTS "takwim_kategori" text;

CREATE INDEX IF NOT EXISTS "pergerakan_takwim_kategori_idx"
  ON "pergerakan" ("takwim_kategori");
