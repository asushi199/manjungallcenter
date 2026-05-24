-- Dashboard kalendar: overlap query (aktif + julat tarikh)
CREATE INDEX IF NOT EXISTS "pergerakan_aktif_range_idx"
ON "pergerakan" ("aktif", "tarikh_kembali", "tarikh_pergi")
WHERE "aktif" = true;
