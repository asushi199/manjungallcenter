# eGerak v2 — PPD Manjung

Sistem pergerakan pegawai **Pejabat Pendidikan Daerah Manjung** (Next.js + Supabase Postgres).
Menggantikan stack lama GAS + Google Sheet di [`../GAS & SHEET/`](../GAS & SHEET/).

**Bahasa UI:** Bahasa Melayu (BM).

---

## Ciri utama

| Modul | Laluan | Nota |
|--------|--------|------|
| Log masuk | `/login` | ID + kata laluan (Auth.js) |
| Kalendar | `/dashboard` | Tapisan sektor, cuti |
| Pergerakan baharu | `/new` | Auto tempahan bilik jika lokasi Budiman/Bestari |
| Rekod saya | `/my` | Edit, OPR |
| Import rancangan | `/admin/import` | CSV pukal (Admin) |
| Tempahan bilik | `/bilik` | Slot AM / PM |
| OPR + AI | `/my/[id]/opr` | Groq utama, Gemini sandaran, max **4 gambar** |
| Cetak OPR | `/my/[id]/opr/print` | PDF melalui pencetak pelayar |
| Pengguna | `/admin/users` | Admin sahaja |

---

## Stack

- **Next.js 15** (App Router, TypeScript, Server Actions)
- **Tailwind CSS**
- **Drizzle ORM** + Postgres (Supabase)
- **Auth.js v5** (Credentials, JWT)
- **Groq API** + **Gemini API** — draf OPR
- **Gambar OPR** — Google Drive melalui **Apps Script** (disyorkan) atau Supabase Storage / Drive API

Zon waktu: `Asia/Kuala_Lumpur` (`date-fns-tz`).

---

## Mula cepat (tempatan)

```powershell
cd egerak-v2
npm install
copy .env.local.example .env.local
# Edit DATABASE_URL, AUTH_SECRET, GROQ_API_KEY/GEMINI_API_KEY, GAS_* (gambar)
npm run db:migrate
npm run db:seed
npm run dev
```

Buka http://localhost:3000 — log masuk seed: `admin` / `AdminMasuk!2026` (tukar kata laluan selepas pertama).

Panduan penuh: [`docs/SETUP-V2.md`](docs/SETUP-V2.md).

---

## Persekitaran (`.env.local`)

| Pembolehubah | Wajib | Keterangan |
|--------------|-------|------------|
| `DATABASE_URL` | Ya | Supabase Postgres URI |
| `AUTH_SECRET` | Ya | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Ya | `http://localhost:3000` (dev) |
| `GROQ_API_KEY` | OPR AI utama | [Groq Console](https://console.groq.com) |
| `GROQ_MODEL` | Disyorkan | `meta-llama/llama-4-scout-17b-16e-instruct` |
| `GEMINI_API_KEY` | OPR AI sandaran | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Sandaran | `gemini-2.5-flash` |
| `OPR_PHOTO_STORAGE` | Gambar | `gas` (disyorkan) |
| `GAS_WEB_APP_URL` | Gambar | URL Web App `/exec` |
| `GAS_UPLOAD_SECRET` | Gambar | Sama dengan Apps Script |

Organisasi MOE sering **melarang Service Account JSON** — gunakan [`docs/GAS_UPLOAD_SETUP.md`](docs/GAS_UPLOAD_SETUP.md), bukan GCP key.

---

## OPR — gambar aktiviti

- **Maksimum 4 gambar** setiap satu OPR (semak di pelayar + server). Beberapa gambar boleh dipilih sekali dan dimuat naik satu demi satu.
- **Mampatan automatik** di pelayar sebelum muat naik: tepi panjang ≤ 1920px, JPEG ~82%, sasaran ≈ 1.2 MB (gambar kecil tidak diubah). HEIC/HEIF daripada iPhone ditukar kepada JPEG di pelayar apabila disokong oleh peranti.
- Fail disimpan di **folder Google Drive PPD** (via Apps Script); teks OPR dalam Postgres.

Konfigurasi GAS: [`docs/GAS_UPLOAD_SETUP.md`](docs/GAS_UPLOAD_SETUP.md) · Skrip: [`gas/Code.gs`](gas/Code.gs).

---

## Struktur projek

```
app/
  (auth)/login
  (app)/dashboard, new, my, bilik, admin/...
lib/
  schema.ts, db.ts, auth.ts
  actions/          # Server actions
  ai-opr.ts         # Draf OPR AI (Groq utama, Gemini sandaran)
  gas-upload.ts     # Muat naik via Apps Script
  storage.ts        # gas | drive | supabase
  opr-photos.ts     # Had 4 gambar + tetapan mampatan
  client/compress-image.ts
gas/Code.gs         # Salin ke script.google.com
drizzle/            # Migrasi SQL
docs/               # SETUP, GAS, OPR, import CSV
```

---

## Skrip npm

| Skrip | Tujuan |
|-------|--------|
| `npm run dev` | Pembangunan |
| `npm run build` | Production build |
| `npm run start` | Jalankan build |
| `npm run db:migrate` | Apply migrasi (`0000`, `0001`, …) |
| `npm run db:seed` | Sektor + bilik + admin |
| `npm run db:create-user` | CLI tambah pengguna |
| `npm run db:generate` | Jana migrasi dari schema |

---

## Dokumentasi

| Dokumen | Topik |
|---------|--------|
| [SETUP-V2.md](docs/SETUP-V2.md) | Supabase, Vercel, env |
| [GAS_UPLOAD_SETUP.md](docs/GAS_UPLOAD_SETUP.md) | Gambar OPR tanpa JSON key |
| [GOOGLE_DRIVE_SETUP.md](docs/GOOGLE_DRIVE_SETUP.md) | Drive API (jika org benarkan key) |
| [BULK_IMPORT.md](docs/BULK_IMPORT.md) | Import CSV rancangan |
| [OPR_DESIGN.md](docs/OPR_DESIGN.md) | Reka bentuk OPR + prompt |

---

## Keselamatan

- Jangan commit `.env.local`, `secrets/`, atau kunci GAS/Groq/Gemini.
- `GAS_UPLOAD_SECRET` mesti panjang dan rawak.
- Folder Drive hanya untuk gambar OPR aktiviti.

---

## Lesen / pemilik

Projek dalaman PPD Manjung. Untuk soalan operasi, rujuk pentadbir sistem / USTP.
