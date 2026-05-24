# Gambar OPR — Google Drive (Service Account + Drive API)

> **Organisasi MOE / PPD sering melarang muat turun Service Account JSON** (`disableServiceAccountKeyCreation`).  
> Jika anda nampak ralat itu, gunakan **[GAS_UPLOAD_SETUP.md](GAS_UPLOAD_SETUP.md)** — tiada JSON diperlukan.

Teks OPR kekal dalam **Postgres (Supabase)**. Gambar disimpan dalam **satu folder Google Drive** akaun/ruang kerja PPD (kapasiti besar, ~60 pegawai × banyak program).

## Ringkasan aliran

1. Pegawai muat naik gambar di `/my/[id]/opr`.
2. Server (service account) memuat naik ke folder Drive yang dikongsi.
3. Fail diberi kebenaran **“Anyone with the link → Viewer”** supaya `<img>` dan cetak PDF berfungsi.
4. DB menyimpan `storage_path` = `drive/{fileId}` dan `public_url` = pautan paparan.

## Langkah 1 — Google Cloud

1. Buka [Google Cloud Console](https://console.cloud.google.com/) (projek PPD atau projek IT).
2. **APIs & Services → Enable APIs** → aktifkan **Google Drive API**.
3. **IAM → Service Accounts → Create** (contoh nama: `egerak-opr-photos`).
4. **Keys → Add key → JSON** → muat turun fail (jangan commit ke git).
5. Simpan fail sebagai contoh: `secrets/google-service-account.json` (folder ini di `.gitignore`).

## Langkah 2 — Folder Drive PPD

1. Log masuk **akaun Google PPD** (contoh `ppdmanjung@...`).
2. Cipta folder contoh: `eGerak OPR Photos`.
3. Kongsi folder dengan **e-mel service account** dari JSON (`client_email`), peranan **Editor** (Pengedit).
4. Salin **Folder ID** dari URL Drive:
   - `https://drive.google.com/drive/folders/XXXXXXXX` → `GOOGLE_DRIVE_FOLDER_ID=XXXXXXXX`

> Jika folder berada dalam **Shared Drive**, pastikan service account ditambah sebagai ahli Shared Drive (sekurang-kurangnya Content manager) dan folder dikongsi seperti di atas.

## Langkah 3 — `.env.local`

```env
# Lalai: Drive (jika kedua-dua dikonfigurasi, Drive diutamakan)
OPR_PHOTO_STORAGE=drive

GOOGLE_DRIVE_FOLDER_ID=isi_folder_id_di_sini
GOOGLE_APPLICATION_CREDENTIALS=secrets/google-service-account.json

# Gemini OPR (wajib model ini)
GEMINI_MODEL=gemini-3.5-flash
```

Sandaran Supabase Storage (opsyenal):

```env
OPR_PHOTO_STORAGE=supabase
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=opr-photos
```

## Langkah 4 — Ujian

1. `npm run dev`
2. Buka rekod pergerakan → **OPR** → muat naik satu gambar.
3. Semak folder Drive: fail baru `opr-{id}-...jpg`.
4. Gambar muncul dalam borang dan **Cetak / PDF**.

## Keselamatan

- Jangan commit fail JSON service account atau `.env.local`.
- Folder hanya untuk gambar OPR; kebenaran “anyone with link” diperlukan untuk paparan web — jangan letak dokumen sulit dalam folder yang sama.
- Had saiz fail boleh ditambah kemudian di server jika perlu (contoh 8 MB).

## Ralat biasa

| Mesej | Penyelesaian |
|--------|----------------|
| `File not found` / 404 pada upload | Folder ID salah, atau folder belum dikongsi dengan `client_email` service account |
| `The user does not have sufficient permissions` | Peranan Editor pada folder; untuk Shared Drive, tambah service account ke drive |
| Gambar tidak dipapar | Tunggu beberapa saat; semak kebenaran fail “Anyone with the link” |
| Storage belum dikonfigurasi | Semak path `GOOGLE_APPLICATION_CREDENTIALS` wujud dari root projek `egerak-v2` |
