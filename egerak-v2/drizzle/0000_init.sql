CREATE TYPE "public"."jenis" AS ENUM('Pergerakan', 'Bercuti');--> statement-breakpoint
CREATE TYPE "public"."peranan" AS ENUM('Admin', 'Pengguna');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('web', 'bulk');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"user_id" integer,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pergerakan" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"sektor_id" integer,
	"jenis" "jenis" DEFAULT 'Pergerakan' NOT NULL,
	"urusan" text NOT NULL,
	"lokasi" text DEFAULT '' NOT NULL,
	"tarikh_pergi" timestamp with time zone NOT NULL,
	"tarikh_kembali" timestamp with time zone NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"source" "source" DEFAULT 'web' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sektors" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"nama" text NOT NULL,
	"jawatan" text DEFAULT '' NOT NULL,
	"sektor_id" integer,
	"peranan" "peranan" DEFAULT 'Pengguna' NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pergerakan" ADD CONSTRAINT "pergerakan_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pergerakan" ADD CONSTRAINT "pergerakan_sektor_id_sektors_id_fk" FOREIGN KEY ("sektor_id") REFERENCES "public"."sektors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_sektor_id_sektors_id_fk" FOREIGN KEY ("sektor_id") REFERENCES "public"."sektors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pergerakan_pergi_idx" ON "pergerakan" USING btree ("tarikh_pergi");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pergerakan_kembali_idx" ON "pergerakan" USING btree ("tarikh_kembali");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pergerakan_user_aktif_idx" ON "pergerakan" USING btree ("user_id","aktif");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pergerakan_sektor_idx" ON "pergerakan" USING btree ("sektor_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sektors_code_idx" ON "sektors" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_aktif_idx" ON "users" USING btree ("aktif");