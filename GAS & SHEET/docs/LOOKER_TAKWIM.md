# TAKWIM — Looker Studio + Google Calendar

## 1. Sumber data

1. Buka [Looker Studio](https://lookerstudio.google.com).
2. **Create** → **Data source** → **Google Sheets**.
3. Pilih spreadsheet **eGerak PPD Manjung - Master Data**, sheet **Pergerakan**.
4. Pastikan lajur `tarikh_pergi` jenis **Date & Time**.

## 2. Halaman TAKWIM (ikut rujukan v4)

### Carta garisan — aktiviti mengikut bulan

- **Chart type:** Time series / Line chart.
- **Date range dimension:** `tarikh_pergi` (granularity: Month).
- **Metric:** Record Count (atau COUNT `id`).
- **Optional filter:** Control `sektor`, `jenis`.

### Kalendar terbenam

1. Dapatkan **public embed URL** kalendar **PPD Manjung - TAKWIM (Master)**:
   - Google Calendar → Settings → Integrate calendar → **Embed code**.
2. Dalam Looker: **Add a chart** → **Embed URL** (atau teks/HTML component).
3. Tampal URL iframe kalendar.

Alternatif: pautan terus ke Google Calendar dalam portal Web App (tab baharu).

## 3. Penapis tahun

- Control: **Drop-down** atau **Date range** pada `tarikh_pergi`.
- Default: tahun semasa.

## 4. Warna mengikut sektor (opsyenal)

Buat **Calculated field** `Sektor_Color` atau guna **Breakdown dimension** = `sektor` pada carta.

## 5. Kemas kini

Looker refresh automatik untuk Sheets (~15 min). Untuk paparan hampir masa nyata, kekalkan senarai harian dalam Web App eGerak.

## 6. URL contoh struktur laporan

```
UTAMA | TAKWIM | PELAPORAN PPD | RUMUSAN PPD
```

- **TAKWIM:** laporan ini (carta + kalendar).
- **PELAPORAN:** Looker kedua sambung `opr_file_url` / status OPR.
- **RUMUSAN:** pivot `sektor` × bulan.
