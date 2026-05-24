# eGerak v2 — Skema Pangkalan Data

Sumber tunggal: [`lib/schema.ts`](../lib/schema.ts). Migrasi dijana ke `drizzle/`.

## Enums

- `peranan`: `Admin | Pengguna`
- `jenis`: `Pergerakan | Bercuti`
- `source`: `web | bulk`

## `sektors`

| Lajur | Jenis | Catatan |
|-------|-------|---------|
| `id` | serial PK | |
| `code` | text UNIQUE | cth `PEMBELAJARAN`, `USTP` |
| `name` | text | Paparan penuh |
| `created_at` | timestamptz | |

Seed awal dalam [`lib/sektors.ts`](../lib/sektors.ts) (8 sektor mengikut struktur PPD Manjung).

## `users`

| Lajur | Jenis | Catatan |
|-------|-------|---------|
| `id` | serial PK | |
| `username` | text UNIQUE | lowercase; tiada email |
| `password_hash` | text | bcrypt (salt 10) |
| `nama` | text | |
| `jawatan` | text | |
| `sektor_id` | int FK → sektors.id | nullable |
| `peranan` | enum | `Admin` atau `Pengguna` |
| `aktif` | bool | login disekat jika false |
| `must_change_password` | bool | true selepas dicipta / reset; paksa redirect ke `/tukar-kata-laluan` |
| `created_at`, `updated_at` | timestamptz | |

## `pergerakan`

| Lajur | Jenis | Catatan |
|-------|-------|---------|
| `id` | serial PK | |
| `user_id` | int FK → users.id | ON DELETE RESTRICT |
| `sektor_id` | int FK → sektors.id | diambil dari user pada submit; boleh kekal nullable |
| `jenis` | enum | `Pergerakan` (default) atau `Bercuti` |
| `urusan` | text | Aktiviti / tujuan |
| `lokasi` | text | |
| `tarikh_pergi` | timestamptz | |
| `tarikh_kembali` | timestamptz | |
| `aktif` | bool | soft delete |
| `source` | enum | `web` atau `bulk` |
| `created_at`, `updated_at` | timestamptz | |

**Indeks**: `tarikh_pergi`, `tarikh_kembali`, `(user_id, aktif)`, `sektor_id`.

### Logik perniagaan

- **Kalendar bulanan** menapis rekod yang **bertindih** dengan sebarang hari dalam bulan:
  `tarikh_pergi <= bulan_akhir AND tarikh_kembali >= bulan_mula`.
- **Statistik aktiviti** secara lalai _exclude_ `Bercuti`. UI ada toggle untuk paparkan cuti
  di kalendar tetapi cuti tidak pernah dikira sebagai aktiviti.
- **Padam = soft delete** (`aktif = false`). Rekod kekal untuk audit / laporan.

## `audit_log`

| Lajur | Jenis | Catatan |
|-------|-------|---------|
| `id` | serial PK | |
| `action` | text | cth `SUBMIT_PERGERAKAN`, `DELETE_PERGERAKAN`, `ADMIN_CREATE_USER`, `CHANGE_PASSWORD` |
| `user_id` | int FK → users.id | nullable (`system` untuk job) |
| `detail` | jsonb | data tambahan |
| `created_at` | timestamptz | |

## Migrasi

```
drizzle/0000_init.sql
```

Tambah migrasi baharu dengan:

```bash
npm run db:generate -- --name=tambah_xxxxx
```

Lihat hasil di `drizzle/`, semak SQL, kemudian `npm run db:migrate`.
