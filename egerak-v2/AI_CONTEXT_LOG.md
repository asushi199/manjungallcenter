# AI Context Log

## 2026-06-20 - Takwim Pengguna

### Ringkasan

- Menambah halaman `/takwim` untuk paparan agenda aktiviti sektor yang ringkas.
- Data menggunakan rekod `pergerakan` sedia ada, tanpa jadual baharu untuk fasa ini.
- `source = 'bulk'` ditafsir sebagai `Rancangan`.
- `takwim_kategori = 'tambahan'` ditafsir sebagai `Tambahan`.
- `source = 'web'` tanpa kategori ditunjukkan sebagai `Lain-lain` sahaja.
- `jenis = 'Bercuti'` dikecualikan daripada Takwim dan tidak dikira sebagai aktiviti.

### Keputusan Produk

- Takwim bertujuan menunjukkan aktiviti, sektor dan maklumat masa ringkas; bukan senarai pegawai.
- Nama pegawai, jawatan dan status OPR tidak dipaparkan di Takwim.
- Butiran masa penuh dan lokasi hanya muncul apabila aktiviti diklik.
- `Lain-lain` tidak dipaparkan secara lalai; pengguna boleh aktifkan penapis `Tunjuk lain-lain`.

### Kebenaran

- Semua pengguna login boleh melihat Takwim.
- Hanya `Admin`, `Ketua_Unit` dan `Timbalan_PPD` boleh menambah Takwim.
- `Ketua_Unit` hanya boleh menambah untuk sektor sendiri.
- `Timbalan_PPD` hanya boleh menambah untuk skop sektor dalam `laporanSektorIds`.
- `Admin` boleh menambah untuk semua sektor.

### Perubahan Teknikal

- Menambah migration `drizzle/0011_takwim_kategori.sql`.
- Menambah field `pergerakan.takwimKategori` dalam Drizzle schema.
- Menambah server action `createTakwimTambahan`.
- Menambah helper Takwim untuk kategori paparan, label masa padat, pilihan sektor URL dan kebenaran tambah.
- Menambah ujian `tests/takwim-utils.test.ts`.

### Nota Lanjutan

- Untuk fasa akan datang, jika rancangan tahunan perlu wujud tanpa pegawai bertanggungjawab, model yang lebih sesuai ialah jadual master seperti `takwim_aktiviti`, kemudian `pergerakan` boleh link kepada aktiviti tersebut.

## 2026-06-20 - Rancangan Tahunan Sebagai Aktiviti Takwim Master

### Ringkasan

- Import Rancangan Tahunan dinaik taraf daripada "cipta banyak pergerakan pegawai" kepada "cipta aktiviti master Takwim".
- Jadual master baharu ialah `takwim_aktiviti`.
- `pergerakan.takwim_aktiviti_id` digunakan untuk link pegawai bertanggungjawab atau peserta pada masa depan.
- `room_bookings.takwim_aktiviti_id` digunakan supaya tempahan bilik boleh wujud walaupun aktiviti belum ada pegawai bertanggungjawab.

### Keputusan Produk

- Setiap baris import mewakili satu aktiviti Takwim, bukan semestinya satu pergerakan individu.
- `Pegawai Bertanggungjawab` dalam template Excel boleh dikosongkan.
- Aktiviti tanpa pegawai bertanggungjawab hanya muncul di `/takwim`, bukan di `Pergerakan Saya`.
- Aktiviti dengan pegawai bertanggungjawab akan muncul di `/takwim` dan juga mencipta linked `pergerakan` untuk pegawai tersebut.
- `Bercuti` tidak dianggap aktiviti Takwim dan tidak diterima dalam import Rancangan Tahunan.

### Perubahan Teknikal

- Menambah migration `drizzle/0012_takwim_aktiviti.sql`.
- Menambah generator template Excel `/api/templates/rancangan-tahunan`.
- Template rasmi mengandungi sheet `Rancangan`, `Contoh`, `Panduan` dan `Kod Sektor`.
- `/takwim` membaca `takwim_aktiviti` sebagai sumber utama, dan hanya memaparkan `Lain-lain` daripada `pergerakan` biasa yang belum link kepada aktiviti Takwim.
- `Tambah Takwim` menulis terus ke `takwim_aktiviti(kategori = 'tambahan')`.
