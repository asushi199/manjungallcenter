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
| `Tarikh Mula` | Ya | `2026-06-15` | Tarikh mula aktiviti |
| `Masa Mula` | Tidak | `08:00` | Dropdown masa; kosong = `08:00` |
| `Tarikh Tamat` | Ya | `2026-06-15` | Mesti sama/selepas tarikh mula |
| `Masa Tamat` | Tidak | `17:00` | Dropdown masa; kosong = `17:00` |
| `Sektor` | Ya | `USTP` | Ikut kod dalam sheet `Kod Sektor` |
| `Tempah Bilik` | Tidak | `Bilik Budiman` | Dropdown bilik terurus; akan cuba ditempah automatik |
| `Lokasi` | Tidak | `SK Seri Manjung` | Lokasi bebas jika bukan bilik terurus |

Jika `Masa Mula` dan `Masa Tamat` dikosongkan, sistem menggunakan `08:00` hingga `17:00` dan menganggap aktiviti sebagai sepanjang hari.

## Model data import

- Setiap baris mencipta satu rekod master dalam `takwim_aktiviti`.
- `kategori = 'rancangan'` untuk import Rancangan Tahunan.
- Aktiviti hanya muncul sebagai rancangan di `/takwim`.
- Pegawai sendiri boleh mengambil aktiviti itu melalui skrin Daftar Pergerakan.
- Baris `Bercuti` tidak diterima sebagai Rancangan Tahunan.

## Tempahan bilik/dewan automatik

Jika `Tempah Bilik` diisi dengan **Bilik Budiman** atau **Dewan Bestari**, sistem akan cuba mencipta tempahan bilik:

- Booking dikaitkan kepada `takwim_aktiviti`, dengan pengguna import sebagai pemilik booking.
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
