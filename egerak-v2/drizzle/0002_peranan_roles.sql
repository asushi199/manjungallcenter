-- Tambah peranan: Penyelia (semua laporan OPR), Ketua_Unit (sektor sendiri)
ALTER TYPE "public"."peranan" ADD VALUE IF NOT EXISTS 'Penyelia';--> statement-breakpoint
ALTER TYPE "public"."peranan" ADD VALUE IF NOT EXISTS 'Ketua_Unit';
