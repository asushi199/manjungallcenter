ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "calendar_default_view" text NOT NULL DEFAULT 'month';

