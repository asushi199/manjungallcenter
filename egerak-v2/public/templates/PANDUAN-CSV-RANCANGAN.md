# Panduan Isi CSV — Rancangan Tahunan (eGerak v2)

Gunakan fail **`rancangan-tahunan-kosong.csv`** (kosong) atau **`rancangan-tahunan-contoh.csv`** (ada contoh baris).

Muat turun dari aplikasi: **Admin → Import** → pautan template.

---

## Cara buka & simpan (Excel)

1. Buka fail `.csv` dengan **Excel** atau **Google Sheets**.
2. Isi satu baris = satu pergerakan / cuti.
3. Simpan sebagai **CSV UTF-8** (jangan simpan sebagai `.xlsx` untuk import).
4. Serahkan fail kepada Admin untuk dimuat naik di **Import Rancangan Tahunan**.

---

## Lajur (baris pertama — jangan ubah nama)

| Lajur | Wajib? | Apa yang perlu diisi |
|-------|--------|----------------------|
| `email` | Ya* | E-mel MOE-DL pegawai, contoh `nama@moe-dl.edu.my` |
| `username` | Ya* | ID log masuk jika tiada e-mel, contoh `ahmad` |
| `urusan` | **Ya** | Nama aktiviti / urusan |
| `lokasi` | Tidak | Contoh `Pejabat PPD Manjung`, `Bilik Budiman`, `Dewan Bestari` |
| `jenis` | Tidak | `Pergerakan Biasa` (lalai) atau `Bercuti` |
| `tarikh_pergi` | **Ya** | **Wajib format ISO:** `2026-06-15` atau `2026-06-15 08:00` (lihat bawah) |
| `tarikh_kembali` | **Ya** | Sama. **Tarikh sahaja** (tanpa jam) = **sepanjang hari** (08:00–17:00, AM+PM) |
| `sektor` | Tidak | Kod sektor (lihat senarai bawah) |
| `status_import` | Tidak | Biarkan kosong. Isi `OK` atau `SKIP` hanya jika baris ini **tidak** perlu diimport semula |

\* Isi **salah satu**: `email` **atau** `username` (bukan kedua-dua wajib).

---

## Kod sektor (pilihan)

| Kod dalam CSV | Sektor |
|---------------|--------|
| `PEMBELAJARAN` | Sektor Pembelajaran |
| `PENGURUSAN_SEKOLAH` | Sektor Pengurusan Sekolah |
| `PEMBANGUNAN_MURID` | Sektor Pembangunan Murid |
| `PENTAKSIRAN` | Sektor Pentaksiran dan Peperiksaan |
| `PSIKOLOGI_KAUNSELING` | Sektor Psikologi dan Kaunseling |
| `PENGURUSAN` | Sektor Pengurusan |
| `PERANCANGAN` | Sektor Perancangan |
| `USTP` | Unit Sumber Teknologi Pendidikan |

---

## Format tarikh rasmi (WAJIB — semua pegawai)

Gunakan **sahaja** format ini supaya sama di semua komputer:

| Jenis | Contoh `tarikh_pergi` | Contoh `tarikh_kembali` |
|-------|----------------------|-------------------------|
| Satu hari penuh | `2026-06-14` | `2026-06-14` |
| Beberapa hari | `2026-06-12` | `2026-06-14` |
| Dengan masa | `2026-06-02 08:00` | `2026-06-02 12:00` |

- **`yyyy-mm-dd`** (contoh `2026-06-14`) — tahun empat digit, bulan dan hari dua digit
- Masa (pilihan): **`HH:mm`** 24 jam, contoh `08:00`, `17:00`
- **Jangan** isi `6/14/2026` atau `14/6/2026` — Excel tukar mengikut PC orang lain

### Elak Excel ubah tarikh

1. Format lajur F & G sebagai **Teks** sebelum taip, **atau**
2. Taip `'2026-06-14` (petik di hadapan), **atau**
3. Sebelum hantar: buka CSV dengan **Notepad** — mesti nampak `2026-06-14`, bukan `6/14/2026`

Rujukan penuh: `docs/DATE-FORMAT-CSV.md` dalam projek.

## Tarikh sahaja (rancangan tahunan)

Jika **tidak pasti masa**, isi **tarikh sahaja** (tanpa jam):

| tarikh_pergi | tarikh_kembali | Maksud |
|--------------|----------------|--------|
| `2026-06-05` | `2026-06-05` | Satu hari penuh (08:00–17:00, AM+PM) |
| `2026-06-12` | `2026-06-14` | Tiga hari penuh berturut-turut |

Jika ada masa penuh, contoh `2026-06-02 08:00`, sistem guna masa tersebut.

## Lokasi bilik / dewan

Jika `lokasi` mengandungi **Bilik Budiman** atau **Dewan Bestari**, sistem akan **tempah slot bilik automatik** (Pagi AM / Petang PM).

- **Tarikh sahaja** → tempahan **sepanjang hari** setiap tarikh dalam julat.
- Jika slot sudah penuh, baris itu akan **gagal** — betulkan tarikh atau lokasi.

## Kemaskini rekod salah

Selepas import, pegawai boleh log masuk → **Pergerakan Saya** → **Edit** pada rekod tersebut (sama seperti borang web).

---

## Baris catatan dalam template (`#NOTA`)

Fail **contoh** dan **kosong** ada beberapa baris bermula dengan `#NOTA` di lajur `email`. Ia hanya **penerangan** — sistem **tidak import** baris ini. Anda boleh biarkan atau padam sebelum isi.

## Perkara penting

1. Pegawai **mesti sudah ada** dalam sistem (Admin daftar pengguna dahulu).
2. Jangan padam baris header (baris pertama).
3. Jangan tambah koma dalam teks melainkan bungkus dengan petik: `"Mesyuarat, taklimat"`.
4. Satu baris = satu rekod; jangan gabung beberapa aktiviti dalam satu sel.

---

## Contoh ringkas

```csv
email,username,urusan,lokasi,jenis,tarikh_pergi,tarikh_kembali,sektor,status_import
ahmad@moe-dl.edu.my,,Mesyuarat KPM,JPN Perak,Pergerakan Biasa,2026-08-01 08:00,2026-08-01 17:00,PEMBELAJARAN,
```

Selepas import, semak di **Utama** (kalendar) dan **Tempahan Bilik** jika lokasi bilik/dewan.
