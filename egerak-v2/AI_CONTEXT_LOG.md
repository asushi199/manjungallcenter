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

## 2026-06-20 - Jawatan Cadangan Dropdown (Boleh Taip Lain)

- `lib/jawatan.ts` baharu: `JAWATAN_OPTIONS` = Penolong PPD, Ketua Unit,
  Timbalan PPD, Pegawai PPD.
- Borang Tambah/Edit Pengguna: input jawatan guna `<datalist>` (cadangan
  dropdown, masih boleh taip jawatan lain seperti kerani/pegawai teknologi).
- Templat Excel Pengguna: lajur jawatan jadi dropdown dengan `allowOther`
  (showErrorMessage=0) — cadangan tetapi tidak menyekat nilai lain.
- `lib/xlsx.ts`: `dropdownValidation` tambah opsyen `{ allowOther }`.
- Tiada migration; nilai jawatan kekal teks bebas.

## 2026-06-21 - Tempahan Bilik: Swakhidmat 24 jam + Permohonan Kelulusan Admin

Logik baharu batal/ubah tempahan bilik:
- Dalam 24 jam (kira dari `room_bookings.created_at`, tetingkap bergolek):
  pemilik boleh ubah/batal sendiri serta-merta.
- Selepas 24 jam: ubah/batal jadi permohonan (PENDING) untuk kelulusan Admin;
  tempahan asal kekal sehingga diluluskan (lulus-dahulu, ubah-kemudian).
- Notifikasi Admin = dalam aplikasi: lencana merah pada menu "Admin"
  (`AdminRequestsBadge`) + halaman `/admin/bilik-permohonan`. (Telegram/email
  ditangguh — buat hanya jika perlu.)

Fail:
- `drizzle/0013_booking_requests.sql` (baharu): jadual `booking_requests`
  + enum `booking_request_type`/`booking_request_status`; unique index PENDING
  satu setiap tempahan. **Perlu dijalankan manual (Supabase SQL editor)** —
  journal drizzle tidak digunakan untuk migrasi 0007+.
- `lib/schema.ts`: jadual + relations + enum + type `BookingRequest`.
- `lib/room-booking-policy.ts` (baharu, tulen/boleh uji): `isWithinGrace`,
  `graceRemainingMs`, `GRACE_PERIOD_MS` (24 jam).
- `lib/actions/rooms.ts`: `cancelBooking` (kini sedar-tempoh), `modifyBooking`
  (baharu — tukar bilik/tarikh/slot), `submitRequest`, `listMyBookings`
  (+createdAt, +pendingType), `listPendingBookingRequests`,
  `countPendingBookingRequests`, `decideBookingRequest` (luluskan/tolak;
  semak konflik slot semula semasa luluskan).
- `app/(app)/bilik/{page,BilikClient}.tsx`: butang Ubah/Batal vs Mohon ubah/
  Mohon batal ikut tempoh; editor ubah inline; cip "menunggu Admin".
- `app/(app)/admin/bilik-permohonan/{page,BilikPermohonanClient}.tsx` (baharu):
  senarai permohonan, banding lama→baharu, Luluskan/Tolak.
- `lib/app-nav.ts`: pautan `PERMOHONAN_BILIK_LINK`.
- `components/{Navbar,AdminRequestsBadge}.tsx`: lencana kiraan (desktop, Admin).
- Ujian baharu: `tests/room-booking-policy.test.ts`. 72 ujian lulus; `tsc`,
  ESLint bersih.

Belum dibuat: lencana mudah alih (mobile nav) — pautan ada, kiraan langsung tiada.

### Susulan hari sama — Tempahan sepanjang hari sebagai satu item

Pengguna minta tempahan sepanjang hari (AM+PM) tidak perlu diubah/batal dua
kali. Pilihan: kekal dua baris dalam DB (tidak ganggu kalendar/sync/cetak/
import), tetapi paparkan & uruskan sebagai SATU unit.

- `drizzle/0014_booking_request_fullday.sql` (baharu): `booking_requests`
  tambah `booking_id_2` (slot kedua; null bagi satu slot). **Perlu jalankan
  manual selepas 0013.**
- `lib/room-booking-group.ts` (baharu, tulen/boleh uji): `groupMyBookings`
  kumpulkan baris AM+PM (bilik+tarikh+tajuk sama) jadi satu `MyBookingItem`
  (`ids: [amId, pmId]`, `slot: "FULL"`).
- `lib/actions/rooms.ts`: `cancelBooking(ids[])` & `modifyBooking({bookingIds,
  roomId,tarikh,slot?})` kini sedar-kumpulan; sepanjang hari pindah kedua-dua
  slot serentak (slot kekal). `submitRequest`/`decideBookingRequest`/
  `listPendingBookingRequests` kendalikan `booking_id_2` (satu permohonan
  meliputi dua slot; semak konflik AM&PM semasa luluskan).
- `app/(app)/bilik/page.tsx`: kumpulkan sebelum hantar ke klien.
- `BilikClient.tsx`: editor sembunyikan pemilih Slot bila sepanjang hari.
- `BilikPermohonanClient.tsx`: papar "Sepanjang hari".
- Ujian: `tests/room-booking-group.test.ts`. 77 ujian lulus; `tsc`/ESLint bersih.

## 2026-06-21 - Pergerakan: Asingkan Tempahan Bilik + Cadangan Urusan Seragam

Spek: docs/superpowers/specs/2026-06-21-pergerakan-decouple-booking-cadangan-design.md
Pelan: docs/superpowers/plans/2026-06-21-pergerakan-decouple-booking-cadangan.md

- **Pergerakan tidak lagi menempah bilik.** `submitPergerakan`/`updatePergerakan`
  berhenti memanggil sync tempahan; tempahan hanya via takwim + /bilik. Tempahan
  sedia ada tidak disentuh. Menutup pintasan kunci 24 jam melalui suntingan.
- **"Tidak perlu tulis OPR" jadi kotak semak berdiri sendiri** (tidak bergantung
  lokasi); kekal cipta OPR status TIADA.
- **Cadangan urusan dua sumber:**
  - Budiman/Bestari → `listRoomBookingCadanganForDay` (tempahan sebenar bilik:
    AM/PM diasing, sepanjang hari digabung, slot diserlah ikut masa pergi/balik
    via `attendanceKind`). Mod C: mesti pilih, atau tanda "tiada dalam senarai".
    Tiada tempahan → peringatan + butang "Tempah sekarang" (guna `bookRoom`).
  - Lokasi lain → `listUrusanTemplatesForDay` (kini diutamakan sektor sendiri,
    semua sektor disertakan); 6 dahulu + "Lihat lagi (N)"; hari sama sahaja.
  - Gerbang lembut: urusan dikunci semasa cadangan dimuat ("Mencari…"), buka
    selepas siap (tiada kotak semak kecuali Mod C); guard respons basi.
- Fail baharu: `lib/pergerakan-slot.ts` (`slotsOnDay`/`attendanceKind`),
  `rankCadanganBySektor` dalam `lib/analisis/day-activity-templates.ts`,
  `listRoomBookingCadanganForDay` dalam `lib/actions/pergerakan.ts`.
  `checkPergerakanRoomAvailability` dibuang. `app/(app)/new/page.tsx` hantar
  `rooms={await listRooms()}`.
- Ujian baharu: `tests/pergerakan-slot.test.ts`, `tests/day-activity-templates.test.ts`.
- Belum dibuat (di luar skop): pengecaman/kitaran hayat tempahan import takwim
  (baki bug #5). Dropdown lokasi Tambah Takwim sudah disiapkan (commit 9f5a4d5).

## Tempahan bilik: slot 8-13 / 13:01-17 + ubah slot (2026-06-24)
- **Label slot** (`lib/room-slots.ts`): Pagi "8:00 pagi – 1:00 petang", Petang
  "1:01 petang – 5:00 petang". `slotTimeRange` selaras (AM 08:00–13:00, PM
  13:01–17:00). Hanya kosmetik/dokumentasi — `computeRoomSlotsForRange`
  (overlap auto-tempah & `attendanceKind`) kekal berpaksi 13:00, tiada gap,
  tiada perubahan kelakuan kehadiran (ujian sedia ada tidak terjejas).
- **Ubah slot semasa "Ubah / Mohon ubah"** (`lib/actions/rooms.ts`): boleh tukar
  slot tunggal ↔ sepanjang hari. `modifySchema` kini terima `fullDay`. Helper
  baharu `reconcileBookingSlots` menyelaras baris sedia ada kepada slot sasaran:
  guna semula, batal lebihan (dahulu — elak langgar `room_bookings_active_unique`),
  sisip yang kurang. Dipakai oleh `modifyBooking` (swakhidmat) & approval
  `decideBookingRequest` (MODIFY). Semantik permohonan: `newSlot` = slot sasaran,
  `null` = sepanjang hari (serasi data lama). UI `BilikClient` ModifyEditor kini
  ada pemilih Slot (Pagi/Petang/Sepanjang hari) untuk semua tempahan;
  `BilikPermohonanClient` papar "Tukar ke" ikut `newSlot` sasaran.
