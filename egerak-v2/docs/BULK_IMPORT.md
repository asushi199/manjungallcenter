# Import Rancangan Tahunan (CSV)

Admin → **Import** → muat naik CSV.

## Template untuk pegawai

| Fail | Kegunaan |
|------|----------|
| [`public/templates/rancangan-tahunan-kosong.csv`](../public/templates/rancangan-tahunan-kosong.csv) | Header sahaja — edar untuk diisi |
| [`public/templates/rancangan-tahunan-contoh.csv`](../public/templates/rancangan-tahunan-contoh.csv) | Contoh 5 baris |
| [`public/templates/PANDUAN-CSV-RANCANGAN.md`](../public/templates/PANDUAN-CSV-RANCANGAN.md) | Panduan BM untuk pegawai |
| [`DATE-FORMAT-CSV.md`](DATE-FORMAT-CSV.md) | **Format tarikh rasmi** + cara elak Excel |

Dalam aplikasi (dev/prod): muat turun dari `/templates/rancangan-tahunan-kosong.csv` dan `/templates/rancangan-tahunan-contoh.csv`.

## Lajur (header baris pertama)

| Lajur | Wajib | Contoh |
|-------|-------|--------|
| `email` | Ya* | `ahmad@moe-dl.edu.my` |
| `username` | Ya* | `ahmad` (jika tiada email) |
| `urusan` | Ya | `Mesyuarat Kurikulum` |
| `tarikh_pergi` | Ya | `2026-06-15 08:00`, `15-06-2026`, atau **`2026-06-15`** (tarikh sahaja) |
| `tarikh_kembali` | Ya | Sama format. **Tarikh sahaja** pada kedua-dua lajur → sepanjang hari (08:00–17:00, AM+PM setiap hari) |
| `lokasi` | Tidak | `Dewan Bestari` |
| `jenis` | Tidak | `Pergerakan Biasa` / `Bercuti` |
| `sektor` | Tidak | `USTP` atau `PEMBELAJARAN` |
| `status_import` | Tidak | `OK` / `SKIP` — baris ini dilangkau |

\* Salah satu: `email` (username = bahagian sebelum `@`) atau `username`.

## Nota

- Pengguna mesti **sudah wujud** dalam sistem (Admin → Pengguna).
- Import menulis ke `pergerakan` dengan `source = bulk`.
- Lokasi **Bilik Budiman** / **Dewan Bestari**: tempahan slot AM/PM automatik (sama seperti borang web); gagal jika slot bertembung.

## Contoh CSV

```csv
email,urusan,lokasi,jenis,tarikh_pergi,tarikh_kembali,sektor
ahmad@moe-dl.edu.my,Program NILAM,PPD Manjung,Pergerakan,2026-06-01 08:00,2026-06-01 17:00,PEMBELAJARAN
```
