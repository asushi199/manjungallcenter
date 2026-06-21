# Reka Bentuk: Asingkan Tempahan Bilik daripada Pergerakan + Seragamkan Cadangan Urusan

Tarikh: 2026-06-21
Status: Diluluskan (menunggu semakan spek sebelum pelan implementasi)

## 1. Latar Belakang & Masalah

Borang Pergerakan (`app/(app)/new/PergerakanForm.tsx`) kini menempah bilik
secara automatik apabila lokasi ialah **Bilik Budiman** atau **Dewan Bestari**.
Pengguna boleh pilih "Tempah (penganjur)" atau "Sertai aktiviti sedia ada".
Ini menimbulkan beberapa pepijat:

1. **Kunci 24 jam boleh dipintas.** `updatePergerakan` membatalkan lalu
   menempah semula bilik tanpa syarat (`cancelRoomBookingsForPergerakan` →
   `syncRoomBookingsFromPergerakan`, `lib/actions/pergerakan.ts`). Maka
   menyunting rekod pergerakan menukar/membatalkan tempahan **tanpa tetingkap
   24 jam dan tanpa kelulusan Admin** — memintas ciri kelulusan yang baru
   disiapkan.
2. **"Sertai aktiviti" ialah pintu keluar teks bebas tanpa pengesahan.** Ia
   tidak terikat kepada mana-mana aktiviti/tempahan sebenar; `urusan` ialah
   textarea bebas. Akibatnya ramai "menyertai" tempahan yang mungkin tidak
   wujud.
3. **Pencemaran nama berulang.** Cadangan urusan
   (`listUrusanTemplatesForDay`) diambil terus daripada teks bebas
   `pergerakan.urusan`. Taip bebas → cemarkan cadangan → orang seterusnya
   pilih daripada cadangan kotor → lebih banyak varian. Gelung memperkuat
   diri.
4. **Tajuk tempahan = teks bebas urusan.** Kalendar /bilik memaparkan urusan
   yang ditaip penganjur; menyunting urusan menukar tajuk tempahan.
5. **Dua pintu tempahan tanpa sumber kebenaran tunggal** (takwim awal tahun +
   pergerakan penganjur).

Kebanyakan aktiviti yang memerlukan bilik **sudah ada dalam rancangan takwim
awal tahun**; yang ad-hoc pun lebih baik ditempah melalui **Tempahan Bilik
(/bilik)**.

## 2. Niat Sebenar Cadangan Urusan

Selain takwim awal tahun, kerap berlaku: sekolah menjemput pegawai, atau
pihak atasan menghantar **ramai pegawai ke aktiviti/lokasi yang sama**. Tujuan
asal cadangan urusan ialah supaya peserta **menggunakan nama aktiviti yang
seragam tanpa menaip semula** — biasanya seorang mengisi dahulu, yang lain
ikut. Mereka biasanya pergi **bersama dalam sektor yang sama**, jadi cadangan
sektor sendiri perlu diutamakan.

Untuk **Bilik Budiman / Dewan Bestari**, sumber kebenaran nama aktiviti
sememangnya sudah wujud: **`room_bookings` (tajuk + slot AM/PM)**.

## 3. Keputusan Reka Bentuk

### 3.1 Pergerakan tidak lagi menempah bilik
- Buang keseluruhan set medan "Bilik / Dewan" daripada borang (radio
  penganjur, semakan ketersediaan, `sepenuh hari` untuk tempahan).
- Pergerakan menjadi **rekod pergerakan semata-mata**. Tempahan bilik hanya
  melalui takwim (auto) + /bilik (manual).
- `submitPergerakan` / `updatePergerakan` berhenti memanggil
  `syncRoomBookingsFromPergerakan` dan logik `tempahBilik`/`shouldBookRoom`.
- **Tempahan sedia ada yang terikat pergerakan tidak diubah** (tidak dibatal
  automatik). Hanya berhenti mencipta/menyelaras yang baharu. Ini turut
  menutup pepijat #1.

### 3.2 Pisahkan pilihan "Tidak perlu tulis OPR"
- Tukar logik `tidakPerluOpr` kepada **kotak semak berdiri sendiri**, tidak
  bergantung pada lokasi/bilik. Mana-mana pergerakan boleh menanda.
- Salinan (Pilihan 1 yang diluluskan):
  - Tajuk: **Tidak perlu tulis OPR**
  - Nota kecil: *OPR aktiviti ini ditulis oleh orang lain (penganjur atau
    rakan yang turut hadir).*

### 3.3 Cadangan urusan — dua sumber mengikut lokasi

**(a) Lokasi = Bilik Budiman / Dewan Bestari** — sumber kebenaran =
`room_bookings` untuk bilik + tarikh tersebut.
- Apabila lokasi ini dipilih dan tarikh diisi, papar tempahan bilik untuk hari
  itu sebagai pilihan urusan.
- **Asingkan ikut slot AM / PM** (Pagi "X", Petang "Y"); serlahkan slot yang
  padan dengan masa pergi/kembali pengguna secara automatik.
- **Jika tempahan ialah sepanjang hari (AM+PM aktiviti sama) → paparkan
  sebagai satu entri, tidak dipecah Pagi/Petang.**
- **Mod penguatkuasaan C** (apabila ADA tempahan): `urusan` mesti dipilih
  daripada senarai; sediakan satu suis "Aktiviti tiada dalam senarai" — hanya
  selepas ditanda barulah boleh taip bebas.
- Apabila satu tempahan dipilih, `urusan` = **tajuk sebenar tempahan** (salin
  teks supaya nama seragam).
- **Apabila TIADA tempahan pada hari/slot itu** (mesyuarat tak rasmi / terlupa
  tempah — pendekatan longgar, tidak memaksa tempah):
  - Jatuh balik kepada **cadangan rakan** — papar pendaftaran pergerakan rakan
    yang sudah pilih bilik ini pada hari itu, supaya nama tetap seragam
    (gerbang lembut seperti lokasi lain di bawah).
  - Papar peringatan lembut (tidak menghalang hantar): *"Bilik ini tiada
    tempahan rasmi pada hari ini. Jika aktiviti rasmi, sila tempah di Tempahan
    Bilik."* + butang **"Tempah sekarang"** yang mencipta tempahan di /bilik
    menggunakan nama aktiviti yang diisi (supaya orang pertama boleh tampung
    tempahan terlupa, dan bilik ditanda sebagai diguna).

**(b) Lokasi lain** (sekolah dll.) — sumber = pendaftaran rakan terkini.
- **Semua sektor dicadangkan**; cadangan **sektor sendiri diutamakan** (diletak
  paling atas, label "Sektor anda"), diikuti sektor lain — kerana sektor lain
  pun mungkin turut serta ke aktiviti yang sama.
- **Papar 6 cadangan dahulu**, selebihnya di sebalik **"Lihat lagi (N)"**.
- Padanan **hari yang sama sahaja** (tiada pelonggaran ±hari). Setiap peserta
  mengisi untuk tarikh sebenar acara, jadi melihat hari yang sama sudah cukup
  dan tidak perlu papar lebih awal.
- Masih benarkan taip bebas (orang pertama mengisi = nama standard).

### 3.3.1 Gerbang lembut "lihat dahulu" (lokasi lain + Budiman/Bestari tiada tempahan)
- Selepas tarikh diisi, sistem mencari cadangan; medan `urusan` **dikunci**
  sementara dengan label "Mencari aktiviti hari ini…".
- Selepas selesai: jika ADA cadangan, ia dipaparkan terbuka & jelas, kemudian
  `urusan` **dibuka untuk taip bebas** — pengguna cuma perlu lihat dahulu,
  **tiada kotak semak wajib** (kotak semak hanya untuk Budiman/Bestari Mod C).
- Tujuan: elak orang gopoh menaip nama sendiri sebelum cadangan muncul.

### 3.4 Pepijat yang ditutup
- #1 (pintasan kunci 24 jam): pergerakan tidak lagi menyentuh tempahan.
- #2 (pintu keluar sertai tanpa pengesahan): Budiman/Bestari kini "pilih
  daripada tempahan sebenar".
- #4 (tajuk tempahan = teks bebas): tajuk datang daripada tempahan /bilik &
  takwim; pergerakan merujuknya.
- #5 (dua pintu tempahan / tempah-terlepas / tempah-berganda): sebahagian
  besar ditutup kerana pergerakan tidak lagi menempah —
  - tempah-berganda "penganjur dihalang oleh tempahan rancangan sendiri" dan
    "pendua bayangan pergerakan" → hilang.
  - tempah-terlepas akibat nama lokasi tidak dikenali (resolveBookableRoomCode)
    → dikurangkan kerana **lokasi kini dropdown** di import, tambah lokasi, dan
    **Tambah Takwim** (sudah dihantar, commit berasingan).
  - **Baki ditangguh (di luar skop spek ini)**: pengecaman lokasi/masa import
    takwim yang masih lemah, dan kitaran hayat tempahan dari takwim (suntingan/
    pembatalan takwim tidak menyelaras tempahan). Ini milik modul takwim —
    jadikan tugas susulan berasingan.

## 4. Skop Tidak Dibuat (YAGNI)
- Tiada jadual "aktiviti" baharu; tiada pautan id peserta↔tempahan. v1 hanya
  menyalin nama standard. Pengumpulan OPR / analitik boleh ditambah kemudian.

## 5. Perkara Untuk Disahkan Semasa Implementasi
- Adakah medan `sepenuh hari` pada pergerakan digunakan di tempat lain selain
  tempahan (cth. paparan/`inferSepenuhHari`)? Jika tidak, buang daripada
  borang.
- Penjanaan OPR automatik perlu diselaraskan dengan `tidakPerluOpr` yang kini
  berdiri sendiri (sahkan logik dalam `submitPergerakan`).
- Fungsi `checkPergerakanRoomAvailability` dan import berkaitan menjadi tidak
  terpakai — buang dengan selamat.
- Tentukan helper memetakan masa pergi/kembali pergerakan kepada slot AM/PM
  (guna semula logik `computeRoomSlotsForRange` / `slotTimeRange` daripada
  `lib/sync-room-bookings.ts` / `lib/room-slots.ts`).
- Butang "Tempah sekarang" (kes tiada tempahan) guna semula `bookRoom`
  (`lib/actions/rooms.ts`) dengan slot terbitan masa; ia melalui tetingkap 24
  jam / aliran kelulusan /bilik seperti biasa.

## 6. Ujian
- Helper pemetaan masa→slot (AM/PM/penuh hari) sebagai fungsi tulen + ujian.
- Helper pembinaan cadangan (keutamaan sektor sendiri, semua sektor disertakan,
  dedup nama, padanan hari sama) sebagai fungsi tulen + ujian.
