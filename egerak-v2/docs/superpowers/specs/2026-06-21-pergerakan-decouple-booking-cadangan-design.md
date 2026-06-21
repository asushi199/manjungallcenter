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
- **Mod penguatkuasaan C**: `urusan` mesti dipilih daripada senarai; sediakan
  satu suis "Aktiviti tiada dalam senarai" — hanya selepas ditanda barulah
  boleh taip bebas.
- Jika bilik tiada tempahan pada hari itu → benarkan taip bebas terus, dengan
  pautan "Tempah dahulu di Tempahan Bilik".
- Apabila satu tempahan dipilih, `urusan` = **tajuk sebenar tempahan**
  (salin teks supaya nama seragam).

**(b) Lokasi lain** (sekolah dll.) — sumber = pendaftaran rakan terkini.
- **Cadangan sektor sendiri diutamakan (diletak paling atas, label "Sektor
  anda")**, kemudian sektor lain.
- Dipaparkan **terbuka & jelas**; satu ketik mengisi urusan + lokasi + tarikh.
- Padanan tarikh dilonggarkan ke **±3 hari** (boleh ditala) supaya beza
  sehari tidak menyembunyikan padanan.
- Masih benarkan taip bebas (orang pertama mengisi = nama standard).

### 3.4 Pepijat yang ditutup
- #1 (pintasan kunci 24 jam): pergerakan tidak lagi menyentuh tempahan.
- #2 (pintu keluar sertai tanpa pengesahan): Budiman/Bestari kini "pilih
  daripada tempahan sebenar".
- #4 (tajuk tempahan = teks bebas): tajuk datang daripada tempahan /bilik &
  takwim; pergerakan merujuknya.

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

## 6. Ujian
- Helper pemetaan masa→slot (AM/PM/penuh hari) sebagai fungsi tulen + ujian.
- Helper pembinaan cadangan (keutamaan sektor, longgar tarikh, dedup) sebagai
  fungsi tulen + ujian.
