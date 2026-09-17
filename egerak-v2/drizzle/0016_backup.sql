-- Sandaran pangkalan data: tetapan automatik (kunci/nilai).
CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" text PRIMARY KEY,
  "value" jsonb NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "app_settings" ENABLE ROW LEVEL SECURITY;
