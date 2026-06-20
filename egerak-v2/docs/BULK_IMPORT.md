# Import Rancangan Tahunan (Excel)

Admin, Ketua Unit dan Timbalan PPD boleh menggunakan halaman **Admin -> Import** untuk memuat naik Rancangan Tahunan.

## Template rasmi

Template utama dimuat turun dari aplikasi:

- `/api/templates/rancangan-tahunan`
- Nama fail: `rancangan-tahunan.xlsx`

Template Excel mengandungi 4 sheet:

| Sheet | Kegunaan |
|------|----------|
| `Rancangan` | Halaman rasmi untuk diisi |
| `Contoh` | Contoh pengisian |
| `Panduan` | Arahan ringkas dalam Bahasa Melayu |
| `Kod Sektor` | Rujukan kod sektor |

Fail CSV lama masih disokong sementara melalui:

- `public/templates/rancangan-tahunan-kosong.csv`
- `public/templates/rancangan-tahunan-contoh.csv`

## Lajur rasmi dalam sheet `Rancangan`

| Lajur | Wajib | Contoh | Nota |
|-------|-------|--------|------|
| `Aktiviti` | Ya | `Mesyuarat Kurikulum` | Nama aktiviti Takwim |
| `Tarikh Mula` | Ya | `2026-06-15` atau `2026-06-15 08:00` | Tarikh sahaja = sepanjang hari |
| `Tarikh Tamat` | Ya | `2026-06-15` atau `2026-06-15 17:00` | Mesti sama/selepas tarikh mula |
| `Sektor` | Ya | `USTP` | Ikut kod dalam sheet `Kod Sektor` |
| `Lokasi` | Tidak | `Dewan Bestari` | Bilik/Dewan tertentu akan cuba ditempah automatik |
| `Pegawai Bertanggungjawab` | Tidak | `ahmad@moe-dl.edu.my` atau `ahmad` | Jika kosong, hanya rekod Takwim dicipta |

## Model data import

- Setiap baris mencipta satu rekod master dalam `takwim_aktiviti`.
- `kategori = 'rancangan'` untuk import Rancangan Tahunan.
- Jika `Pegawai Bertanggungjawab` diisi dan pengguna wujud, sistem turut mencipta satu `pergerakan` yang link kepada `takwim_aktiviti`.
- Jika `Pegawai Bertanggungjawab` kosong, aktiviti hanya muncul di `/takwim` dan tidak muncul dalam `Pergerakan Saya` mana-mana pegawai.
- Baris `Bercuti` tidak diterima sebagai Rancangan Tahunan.

## Tempahan bilik/dewan automatik

Jika `Lokasi` mengandungi **Bilik Budiman** atau **Dewan Bestari**, sistem akan cuba mencipta tempahan bilik:

- Ada pegawai bertanggungjawab: booking dikaitkan kepada `pergerakan` dan `takwim_aktiviti`.
- Tiada pegawai bertanggungjawab: booking dikaitkan kepada `takwim_aktiviti`, dengan pengguna import sebagai pemilik booking.
- Jika slot bertembung, baris import gagal dan mesej ralat dipaparkan.

## Keputusan import

Paparan keputusan kekal dalam bentuk:

- `OK`
- `Ralat`
- `Langkau`

Mesej OK menerangkan tindakan yang berlaku, contohnya:

- `Aktiviti Takwim dicipta`
- `Aktiviti Takwim dicipta; pergerakan pegawai dicipta`
- `Aktiviti Takwim dicipta; pergerakan pegawai dicipta; 2 slot bilik ditempah`

## Nota migrasi

Migration `drizzle/0012_takwim_aktiviti.sql` backfill rekod lama:

- `pergerakan.source = 'bulk'` menjadi `takwim_aktiviti.kategori = 'rancangan'`
- `pergerakan.takwim_kategori = 'tambahan'` menjadi `takwim_aktiviti.kategori = 'tambahan'`
- `pergerakan.takwim_aktiviti_id` dan `room_bookings.takwim_aktiviti_id` diisi untuk rekod berkaitan
