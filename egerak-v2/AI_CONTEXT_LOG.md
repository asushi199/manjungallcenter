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

## 2026-06-20 - Import Rancangan Tanpa Owner; Excel Sektor Dropdown; Buang CSV Lama

### Ringkasan

- Import Rancangan Tahunan dipermudah: **tiada pegawai bertanggungjawab** semasa
  import (Route A). Setiap baris hanya cipta aktiviti master `takwim_aktiviti`.
- Bilik (Bilik Budiman / Dewan Bestari) **tetap ditempah lebih awal** semasa import
  supaya tidak diduduki orang lain — tempahan dipaut pada aktiviti (bukan pegawai).
- Pegawai "ambil" aktiviti melalui skrin Daftar Pergerakan (Cadangan urusan),
  lalu cipta pergerakan sendiri + tempah/sertai bilik + isi OPR sendiri.

### Keputusan Produk

- Padanan pegawai melalui nama bebas tidak boleh dipercayai (nama serupa / salah
  taip) → buang konsep owner semasa import; elak kegagalan pautan pergerakan.
- Templat Excel: lajur `Pegawai Bertanggungjawab` dibuang; lajur **Sektor jadi
  senarai juntai-bawah (dropdown)** rujuk sheet "Kod Sektor" → elak kod salah taip.
- Templat **CSV lama dibuang** (butang + fail) — guna Excel sahaja. Backend masih
  terima muat naik .csv.

### Perubahan Teknikal

- `lib/rancangan-import.ts`: buang `ownerUsername` dari `NormalizedRancanganRow`
  & logik normalize; buang lajur owner dari `RANCANGAN_HEADERS`/Contoh/Panduan;
  tambah `sektorDropdownXml` (OOXML dataValidation list) pada sheet Rancangan.
- `lib/actions/bulk-import.ts`: `processRancanganRow` cipta aktiviti tanpa owner
  sahaja; tempahan bilik guna `syncRoomBookingsFromTakwimAktiviti`; buang
  `resolveOwner` + import `pergerakan`/`users`/`syncRoomBookingsFromPergerakan`.
- `app/(app)/admin/import/ImportClient.tsx`: buang butang CSV lama; kemas teks.
- Padam `public/templates/rancangan-tahunan-{kosong,contoh}.csv`.
- `tests/rancangan-import.test.ts`: kemas kini ujian (tiada owner). 40 ujian lulus;
  `tsc` & ESLint bersih. Tiada migration baharu diperlukan.

## 2026-06-20 - Pengguna Import Excel; Lajur "Tempah Bilik"; Modul xlsx Dikongsi

### Ringkasan

- Import Pengguna kini sokong **Excel (.xlsx)** dengan **dropdown Sektor & Peranan**,
  sama seperti import Rancangan. Backend masih terima muat naik .csv.
- Rancangan: ganti pengesanan bilik secara teks dengan **lajur "Tempah Bilik"**
  (dropdown: Dewan Bestari / Bilik Budiman) — lokasi lain tetap di lajur Lokasi.
- Logik baca/tulis XLSX diekstrak ke modul kongsi `lib/xlsx.ts`.

### Keputusan Produk

- Dropdown Sektor/Peranan elak salah taip kod & peranan. Label peranan mesra
  ("Pegawai PPD", "Ketua Unit") — `mapPerananCsv` kenal kesemuanya.
- "Tempah Bilik" jadi sumber tunggal & tepat untuk pengesanan tempahan bilik;
  bilik diutamakan sebagai lokasi aktiviti bila dipilih.
- Templat CSV pengguna dibuang (Excel jadi utama); muat naik .csv masih diterima.

### Perubahan Teknikal

- `lib/xlsx.ts` (baharu): `buildXlsxWorkbook`, `readWorkbookRows`, `colName`,
  `dropdownValidation`, `dataValidationsXml`.
- `lib/rancangan-import.ts`: guna `lib/xlsx`; tambah lajur "Tempah Bilik" +
  dua dropdown (Sektor rujuk sheet, Tempah Bilik senarai literal); normalize
  utamakan bilik sebagai lokasi; `readRancanganWorkbookRows` jadi alias.
- `lib/user-template.ts` (baharu): `buildUserTemplateWorkbook` (dropdown
  Sektor & Peranan).
- `app/api/templates/pengguna/route.ts` (baharu): muat turun templat Excel.
- `lib/actions/bulk-user-import.ts`: ekstrak `importUserRows`; tambah
  `importUsersXlsx`.
- `components/AdminUsersImport.tsx`: terima .xlsx; pautan templat Excel.
- Padam `public/templates/pengguna-{kosong,contoh}.csv`.
- Ujian baharu: `tests/user-template.test.ts` + kes "Tempah Bilik".
  43 ujian lulus; `tsc`, ESLint, `next build` bersih. Tiada migration.
