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

## 2026-06-20 - Ringkas Import Pengguna; Timbalan = Pegawai PPD; Menu Admin Seragam

### Ringkasan

- Empat perubahan berkaitan untuk memudahkan sistem untuk pegawai PPD.
- Commit `fcbebe9` pada cabang `codex-rancangan-master-import`.

### Keputusan Produk

- **Import Pengguna CSV** dipermudah kepada 5 lajur sahaja: `username, nama,
  jawatan, sektor, peranan`. Lajur `email` dan `laporan_sektor` dibuang dari
  templat/panduan/UI kerana mengelirukan pengguna. (Lajur `email` lama masih
  ditoleransi oleh `resolveUsername` untuk fail lama.)
- **Timbalan PPD disetarakan dengan Penyelia (Pegawai PPD)**: boleh lihat
  semua sektor dalam Laporan OPR / Analisis / Padam Pergerakan, dengan
  paparan lalai = sektor sendiri (boleh tukar). Skop `laporanSektorIds`
  dimansuhkan tetapi lajur DB **dikekalkan** (tiada migration).
- **Peranan `Penyelia` dipaparkan sebagai "Pegawai PPD"** (nilai dalaman
  `Penyelia` kekal). Import menerima alias `pegawai_ppd` / `pegawai ppd`.
- **Menu pentadbiran semua peranan diseragamkan bertajuk "Admin"** —
  peranan tidak diulang dalam menu kerana sudah dipapar di bawah nama.

### Perubahan Teknikal

- `lib/roles.ts`: `canViewAllLaporanOpr` & `canViewAllAnalisisPergerakan`
  termasuk Timbalan; `perananUsesLaporanSektorScope` kini sentiasa `false`
  (`@deprecated`); label peranan dikemas kini.
- `lib/sektor-admin-scope.ts`: cabang `Timbalan_PPD` → `allSectors: true`.
- `lib/actions/laporan-opr.ts`: buang sekatan Timbalan + fungsi
  `getUserLaporanSektorScope`.
- Halaman `laporan-opr`, `analisis-pergerakan`, `pergerakan` (Padam): buang
  banner/penapis skop Timbalan; Timbalan default sektor sendiri.
- `lib/actions/bulk-user-import.ts`: buang pemprosesan `laporanSektorIds`;
  guna `.returning({ id })` ganti query berulang.
- `lib/csv-parse.ts`: alias peranan `pegawai_ppd`.
- `lib/app-nav.ts`: tambah `adminMenuLinksForPeranan`; buang
  `roleNavLabelsForPeranan`/`RoleNavLabels` yang tidak lagi digunakan.
- `components/Navbar.tsx`, `components/MobileNavMenu.tsx`: satu menu "Admin".
- `components/AdminUsersImport.tsx`: nota 5 lajur.
- Templat: `pengguna-kosong.csv`, `pengguna-contoh.csv`,
  `PANDUAN-CSV-PENGGUNA.md` dikemas kini ke 5 lajur.
- Ujian: `tests/csv-parse.test.ts` tambah assertion alias Pegawai PPD.
  Semua 40 ujian lulus; `tsc --noEmit` & ESLint bersih.

### Kesan Sampingan (perlu pantau)

- Kerana Timbalan kini `allSectors` di mana-mana, dan
  `canSectorDeletePergerakan` masih termasuk Timbalan, **Timbalan kini
  boleh padam pergerakan semua sektor** (Penyelia tiada hak padam). Jika
  hak padam perlu dihadkan, kembalikan secara berasingan.
- `components/LaporanSektorScopePicker.tsx` kini tidak digunakan (dikekalkan).
