# Format tarikh CSV — standard rasmi eGerak v2

**Semua pegawai mesti ikut format di bawah.** Format ini tidak bergantung pada tetapan Windows/Excel.

Zon masa: **Malaysia (UTC+8)**. Masa 24 jam.

---

## Format rasmi (utama — gunakan ini)

| Jenis | `tarikh_pergi` | `tarikh_kembali` | Maksud |
|-------|----------------|------------------|--------|
| Sepanjang hari | `2026-06-14` | `2026-06-14` | Satu hari penuh (08:00–17:00) |
| Beberapa hari | `2026-06-12` | `2026-06-14` | 12–14 Jun, setiap hari penuh |
| Dengan masa | `2026-06-02 08:00` | `2026-06-02 12:00` | Pergi 8 pagi, balik 12 tengah hari |

Peraturan:

- Tarikh: **`yyyy-mm-dd`** (empat digit tahun, bulan 2 digit, hari 2 digit)
- Masa (jika ada): **`HH:mm`** 24 jam, contoh `08:00`, `17:00`
- Ruang antara tarikh dan masa: satu jarak ` `
- **Jangan** guna `6/14/2026`, `14-06-2026`, atau format lain sebagai standard

Contoh betul:

```text
2026-06-05
2026-06-12 08:00
2026-12-01 13:30
```

---

## Apa yang sistem terima (sandaran sahaja)

Jika Excel sudah tukar sel kepada `6/14/2026`, import **masih boleh** berjaya (sistem cuba teka), tetapi **berisiko salah hari** apabila kedua-dua nombor ≤ 12 (contoh `6/5/2026`).

**Jangan bergantung pada sandaran ini untuk rancangan tahunan.**

---

## Cara elak Excel ubah format (penting)

### Kaedah A — Taip sebagai teks (disyorkan)

1. Lajur **F** dan **G** (`tarikh_pergi`, `tarikh_kembali`): format sel sebagai **Text / Teks**
2. Taip terus: `2026-06-14` (Excel tidak akan tukar kepada 6/14/2026)

### Kaedah B — Awalan petik

Taip dalam sel: `'2026-06-14` (petik tunggal di hadapan). Petik tidak kelihatan selepas Enter.

### Kaedah C — Google Sheets

Sheets kurang “membetulkan” tarikh jika sel diformat **Plain text**. Muat turun sebagai CSV.

### Kaedah D — Jangan double-click CSV

- Buka Excel → **Data → From Text/CSV** → pilih fail → set lajur tarikh sebagai **Text**
- Atau: isi dalam template kosong yang sudah guna format ISO, jangan copy-paste dari jadual lama

### Semak sebelum hantar

Buka fail dengan **Notepad** (Buku Nota). Pastikan baris kelihatan seperti:

```csv
test01,,Urusan,Bilik Budiman,Pergerakan,2026-06-12,2026-06-14,USTP,
```

Bukan:

```csv
...,6/12/2026,6/14/2026,...
```

---

## Rujukan pantas untuk Admin

- Template rasmi: `public/templates/rancangan-tahunan-kosong.csv` (sudah ISO)
- Contoh: `public/templates/rancangan-tahunan-contoh.csv`
- Panduan pegawai: `public/templates/PANDUAN-RANCANGAN-TAHUNAN.md`
