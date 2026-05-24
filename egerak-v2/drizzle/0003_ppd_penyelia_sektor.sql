INSERT INTO "sektors" ("code", "name")
VALUES ('PPD_PENTADBIRAN', 'Pegawai PPD')
ON CONFLICT ("code") DO NOTHING;
