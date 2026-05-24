ALTER TYPE "public"."peranan" ADD VALUE IF NOT EXISTS 'Timbalan_PPD';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "laporan_sektor_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;
