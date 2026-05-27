-- Kalendar setting (week start, grid orientation, color preset)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "calendar_week_starts_on" text NOT NULL DEFAULT 'mon';

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "calendar_grid_orientation" text NOT NULL DEFAULT 'horizontal';

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "calendar_color_preset" text NOT NULL DEFAULT 'default';

