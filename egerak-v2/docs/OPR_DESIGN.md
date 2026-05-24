# eGerak v2 — Reka Bentuk OPR + Gemini (untuk dilaksanakan)

Dokumen ini menyimpan **reka bentuk OPR (Outcome / Program Report) v2**. **Tidak dilaksanakan
dalam v1**, supaya fokus pada teras (kalendar + filter + login). Bila siap untuk dibuat,
ikut struktur di bawah.

---

## 1. Persona & Strategi Prompt (Gemini)

Berdasarkan perbincangan pengguna dengan Gemini, kita upgrade dari "guru / SISC+" kepada
**Pegawai Kanan PPD** yang memahami semua sektor.

### System Prompt (BM, ditapis untuk JSON sahaja)

```
Anda ialah Pegawai Kanan Pejabat Pendidikan Daerah (PPD) yang sangat berpengalaman dan
mahir dalam operasi, terminologi, dan KPI semua sektor di bawah Kementerian Pendidikan
Malaysia (KPM). Sektor termasuk Sektor Pembelajaran, Sektor Pengurusan Sekolah, Sektor
Pembangunan Murid, Sektor Pentaksiran dan Peperiksaan, Sektor Psikologi dan Kaunseling,
Sektor Pengurusan, dan USTP.

LANGKAH BERFIKIR (mandatory, dalaman):
1) Analisis "Nama Program" + Maklumat Tambahan + Sasaran untuk menyimpulkan sektor /
   unit yang berkemungkinan menganjurkan (akademik? ko-kurikulum? pentadbiran? IT?
   psikologi? dsb).
2) Adaptasikan kosa kata, fokus, dan nada sepadan dengan sektor tersebut.
   - Program pentadbiran -> fokus efisiensi, pematuhan SOP, pengurusan.
   - Program murid -> fokus pembangunan murid, penyertaan, sahsiah.
   - Program PdP -> fokus amalan terbaik, pencerapan, pencapaian.

BAHASA: Bahasa Melayu rasmi KPM (laras bahasa rasmi pejabat kerajaan).

KEKANGAN OUTPUT:
- "dapatan": sekurang-kurangnya 3 bullet point (gabungkan dalam satu string dengan
  baris baharu / dash); jelaskan kejayaan pelaksanaan, kualiti penyertaan, dan
  pemerhatian khusus sektor.
- "rumusan": satu perenggan kukuh; rumuskan impak ke arah objektif sektor.
- "refleksi": penilaian kritikal (kekuatan / kelemahan) + 2 tindakan susulan konkrit
  yang selari dengan kitaran PDCA (Plan-Do-Check-Act).

FORMAT: Kembalikan JSON sahaja dengan kunci dapatan, rumusan, refleksi.
Jangan letak blok markdown / komen / teks luar JSON.
```

### User Prompt (template per-rekod)

```
DATA REKOD:
Nama Pegawai: {nama}
Jawatan: {jawatan}
Sektor (dari profil): {sektor_profil}
Sektor (override jika diisi pegawai): {sektor_override_or_null}

Nama Program / Urusan: {urusan}
Lokasi: {lokasi}
Tarikh: {tarikh_pergi} hingga {tarikh_kembali}

Maklumat Tambahan / Objektif Ringkas (jika diisi):
{maklumat_tambahan_or_"(tiada)"}

Sasaran / Kumpulan Sasar (jika diisi):
{sasaran_or_"(tiada)"}

Nota Pegawai (mentah):
{nota_pegawai_or_"(tiada)"}

Hasilkan JSON: { "dapatan": "...", "rumusan": "...", "refleksi": "..." }
```

### Endpoint

`POST /api/opr/draft` (Server Action `generateOprDraft`)

- Auth: pengguna mestilah pemilik rekod **atau** Admin.
- Hits Gemini (model `gemini-3.5-flash`).
- Fallback bila tiada API key: gunakan template tetap (dapatan = nota / template; rumusan
  = "Program berjalan lancar..."; refleksi = "Penambahbaikan untuk pelaksanaan akan
  datang...") supaya pegawai boleh teruskan isi manual.

---

## 2. Skema DB Tambahan (v2)

Tambah ke `pergerakan` (atau pisahkan ke jadual `opr` 1:1 — disyorkan):

### Pilihan A — tambah dalam `pergerakan`

```ts
opr_status: text          // 'TIADA' | 'DRAFT' | 'SIAP'
opr_dapatan: text
opr_rumusan: text
opr_refleksi: text
opr_maklumat_tambahan: text
opr_sasaran: text
opr_sektor_override_id: int FK -> sektors.id    // nullable
opr_file_url: text         // pautan PDF / Doc (bila dijana)
opr_updated_at: timestamptz
```

### Pilihan B — jadual berasingan `opr`

```ts
opr: {
  id: serial PK,
  pergerakan_id: int UNIQUE FK -> pergerakan.id,
  status: text,
  dapatan: text,
  rumusan: text,
  refleksi: text,
  maklumat_tambahan: text,
  sasaran: text,
  sektor_override_id: int FK -> sektors.id,
  file_url: text,
  created_at, updated_at
}
```

Pilihan B lebih bersih (membolehkan rekod pergerakan tiada OPR). **Disyorkan.**

---

## 3. UI / Form OPR (v2)

Pada halaman `/my` (atau `/pergerakan/[id]/opr`):

```
+----------------------------------------------------+
|  OPR untuk: {urusan}                               |
|                                                    |
|  Sektor      : [Dropdown: PEMBELAJARAN | ... ]     |
|                (lalai dari profil; boleh override) |
|                                                    |
|  Maklumat Tambahan / Objektif Ringkas              |
|  +-----------------------------------------+       |
|  | (textarea)                              |       |
|  +-----------------------------------------+       |
|  | Maklumat tambahan ini membantu sistem   |       |
|  | menjana Dapatan dan Rumusan yang lebih  |       |
|  | spesifik.                                |      |
|                                                    |
|  Sasaran (cth: Guru Besar SK, Penolong Kanan)      |
|  [ ............................................. ] |
|                                                    |
|  Nota Pegawai (mentah; pilihan)                    |
|  +-----------------------------------------+       |
|                                                    |
|  [Butang: Jana Draf (AI)]                          |
|                                                    |
|  --- Selepas dijana ---                            |
|  Dapatan   [textarea, boleh edit]                  |
|  Rumusan   [textarea, boleh edit]                  |
|  Refleksi  [textarea, boleh edit]                  |
|                                                    |
|  [Simpan Draf]  [Tandakan Siap]                    |
+----------------------------------------------------+
```

- Bila tiada `GEMINI_API_KEY` set, butang **Jana Draf (AI)** disable + tunjukkan info
  "Mode AI dimatikan — sila isi manual."
- "Tandakan Siap" mengunci edit; Admin sahaja boleh buka semula.

---

## 4. Env / Config

```
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash       # lalai

# Gambar OPR — Google Drive folder PPD (lihat GOOGLE_DRIVE_SETUP.md)
GOOGLE_DRIVE_FOLDER_ID=
GOOGLE_APPLICATION_CREDENTIALS=secrets/google-service-account.json
OPR_PHOTO_STORAGE=drive              # atau supabase
```

Logik server:

```ts
const key = process.env.GEMINI_API_KEY;
if (!key) return { mode: "manual", ...fallbackTemplate() };
```

---

## 5. Eksport Dokumen (kemudian)

- v2 awal: simpan teks sahaja dalam DB; pegawai boleh print / copy.
- v2.1: jana PDF guna `@react-pdf/renderer` atau `pdf-lib`.
- v2.2: jika perlu `.docx`, guna `docx` library; simpan ke Supabase Storage.

---

## 6. Senarai Tugasan untuk v2

- [ ] Tambah jadual `opr` + migrasi
- [ ] Server action `generateOprDraft({ pergerakanId, sektorOverrideId, maklumatTambahan, sasaran, nota })`
- [ ] Fallback bila tiada API key
- [ ] UI form OPR di `/my/[id]/opr` (atau modal di `/my`)
- [ ] Edit + simpan draf + tandakan siap
- [ ] Audit log: `OPR_DRAFT`, `OPR_SAVED`, `OPR_FINAL`
- [ ] (Opsyenal) Eksport PDF
- [ ] Update dokumen + README
