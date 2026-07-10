-- Aktifkan Row Level Security pada semua jadual awam.
-- Aplikasi ini sambung terus ke Postgres guna DATABASE_URL (peranan pemilik jadual,
-- bukan anon/authenticated Supabase), jadi ia tidak terjejas oleh RLS.
-- Tujuan: sekat PostgREST awam Supabase (anon key) daripada baca/tulis jadual ini terus.

ALTER TABLE "sektors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pergerakan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "takwim_aktiviti" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "room_bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "booking_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "opr" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "opr_photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
