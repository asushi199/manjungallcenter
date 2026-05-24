CREATE TYPE "public"."room_slot" AS ENUM('AM', 'PM');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('BOOKED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."opr_status" AS ENUM('TIADA', 'DRAFT', 'SIAP');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "import_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_user_id" integer,
	"filename" text,
	"stats" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "room_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"tarikh" date NOT NULL,
	"slot" "room_slot" NOT NULL,
	"user_id" integer NOT NULL,
	"pergerakan_id" integer,
	"title" text NOT NULL,
	"status" "booking_status" DEFAULT 'BOOKED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opr" (
	"id" serial PRIMARY KEY NOT NULL,
	"pergerakan_id" integer NOT NULL,
	"status" "opr_status" DEFAULT 'DRAFT' NOT NULL,
	"sektor_override_id" integer,
	"maklumat_tambahan" text DEFAULT '',
	"sasaran" text DEFAULT '',
	"nota_pegawai" text DEFAULT '',
	"dapatan" text DEFAULT '',
	"rumusan" text DEFAULT '',
	"refleksi" text DEFAULT '',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opr_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"opr_id" integer NOT NULL,
	"storage_path" text NOT NULL,
	"public_url" text,
	"mime_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_pergerakan_id_pergerakan_id_fk" FOREIGN KEY ("pergerakan_id") REFERENCES "public"."pergerakan"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opr" ADD CONSTRAINT "opr_pergerakan_id_pergerakan_id_fk" FOREIGN KEY ("pergerakan_id") REFERENCES "public"."pergerakan"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opr" ADD CONSTRAINT "opr_sektor_override_id_sektors_id_fk" FOREIGN KEY ("sektor_override_id") REFERENCES "public"."sektors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opr_photos" ADD CONSTRAINT "opr_photos_opr_id_opr_id_fk" FOREIGN KEY ("opr_id") REFERENCES "public"."opr"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rooms_code_idx" ON "rooms" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "room_bookings_active_unique" ON "room_bookings" USING btree ("room_id","tarikh","slot") WHERE "status" = 'BOOKED';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "room_bookings_room_date_idx" ON "room_bookings" USING btree ("room_id","tarikh");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "room_bookings_user_idx" ON "room_bookings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "opr_pergerakan_idx" ON "opr" USING btree ("pergerakan_id");
