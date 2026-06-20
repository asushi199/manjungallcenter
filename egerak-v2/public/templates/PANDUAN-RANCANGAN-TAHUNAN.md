# Panduan Import Rancangan Tahunan (eGerak v2)

Gunakan template rasmi **`rancangan-tahunan.xlsx`** dari halaman **Admin -> Import**.

Fail CSV lama masih boleh dimuat naik sementara, tetapi template utama untuk edaran pegawai ialah Excel.

## Cara isi template Excel

1. Buka fail `rancangan-tahunan.xlsx`.
2. Isi hanya sheet **Rancangan**.
3. Satu baris = satu aktiviti Takwim.
4. Jangan ubah nama header.
5. Simpan sebagai `.xlsx`.
6. Muat naik semula di halaman **Import Rancangan Tahunan**.

## Lajur yang perlu diisi

| Lajur | Wajib? | Apa yang perlu diisi |
|-------|--------|----------------------|
| `Aktiviti` | Ya | Nama aktiviti, contoh `Mesyuarat Kurikulum` |
| `Tarikh Mula` | Ya | Contoh `2026-06-15` atau `2026-06-15 08:00` |
| `Tarikh Tamat` | Ya | Contoh `2026-06-15` atau `2026-06-15 17:00` |
| `Sektor` | Ya | Kod sektor, contoh `USTP` |
| `Lokasi` | Tidak | Contoh `Pejabat PPD Manjung`, `Bilik Budiman`, `Dewan Bestari` |
| `Pegawai Bertanggungjawab` | Tidak | E-mel atau username pegawai. Boleh dikosongkan. |

## Maksud pegawai bertanggungjawab

- Jika diisi, sistem akan cipta aktiviti Takwim dan satu pergerakan untuk pegawai tersebut.
- Jika dikosongkan, sistem hanya cipta aktiviti Takwim. Rekod ini tidak masuk ke `Pergerakan Saya` mana-mana pegawai.
- Pegawai mesti sudah wujud dalam sistem jika ruangan ini diisi.

## Format tarikh

Format yang disyorkan:

| Situasi | Tarikh Mula | Tarikh Tamat |
|---------|-------------|--------------|
| Satu hari penuh | `2026-06-15` | `2026-06-15` |
| Beberapa hari | `2026-06-12` | `2026-06-14` |
| Ada masa khusus | `2026-06-15 08:00` | `2026-06-15 12:00` |

Tarikh sahaja bermaksud aktiviti sepanjang hari.

## Lokasi bilik / dewan

Jika lokasi mengandungi **Bilik Budiman** atau **Dewan Bestari**, sistem akan cuba menempah bilik secara automatik.

- Jika slot masih kosong, tempahan akan dibuat.
- Jika slot sudah ditempah, baris tersebut akan gagal dan mesej ralat dipaparkan.

## Perkara penting

1. Jangan masukkan cuti dalam import Rancangan Tahunan.
2. Jangan gabung beberapa aktiviti dalam satu baris.
3. Gunakan kod sektor dalam sheet **Kod Sektor**.
4. Jika tidak pasti pegawai bertanggungjawab, kosongkan dahulu. Aktiviti masih akan masuk ke Takwim.
