# eGerak v2 — Panduan Pemasangan

Dokumen ini untuk USTP / pentadbir teknikal yang akan menyediakan dan menyelenggara sistem.
Pegawai biasa hanya perlu URL Vercel + ID/kata laluan dari Admin.

---

## A. Cipta projek Supabase (DB percuma)

1. Pergi ke [supabase.com](https://supabase.com) → **New project**.
2. Region: pilih **Southeast Asia (Singapore)** untuk latensi terbaik dari Malaysia.
3. Tetapkan kata laluan DB yang kuat. Simpan di tempat selamat.
4. Tunggu projek siap dibuat (~2 minit).
5. **Project Settings → Database → Connection string → URI** — untuk **Vercel** wajib guna
   **Transaction pooler** (bukan Session), port **6543**, contoh:

   ```
   postgres://postgres.abcxyz:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

   Gantikan `[YOUR-PASSWORD]` dengan kata laluan sebenar. Session mode (port 5432) mudah
   menyebabkan ralat `max clients reached` pada trafik sederhana.

---

## B. Setup tempatan

```bash
cd egerak-v2
npm install
copy .env.local.example .env.local
```

Edit `.env.local`:

| Pembolehubah | Penerangan |
|--------------|-----------|
| `DATABASE_URL` | Connection string Supabase (langkah A.5) |
| `AUTH_SECRET` | Jana rentetan rawak 32 bait; contoh: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` (dev); URL Vercel sebenar (prod) |
| `SEED_ADMIN_*` | Maklumat Admin awal (akan dicipta sekali oleh `db:seed`) |

Migrasi + seed:

```bash
npm run db:migrate    # cipta jadual + index
npm run db:seed       # isi 8 sektor + Admin pertama
```

Selepas seed, log masuk dengan:

- Username: `admin` (atau ikut `SEED_ADMIN_USERNAME`)
- Kata laluan: nilai `SEED_ADMIN_PASSWORD`

Sistem akan minta tukar kata laluan pada login pertama.

---

## C. Deploy ke Vercel (percuma)

1. Push folder `egerak-v2/` ke repository Git (GitHub disarankan).
2. Di [vercel.com](https://vercel.com) → **New Project** → import repo tersebut.
3. **Root Directory**: pilih `egerak-v2` (jika folder berada dalam monorepo).
4. **Environment Variables** — masukkan yang sama seperti `.env.local`:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `NEXTAUTH_URL` = URL akhir Vercel (cth `https://egerak.vercel.app`)
   - `SEED_ADMIN_*` (opsyenal — hanya digunakan oleh `db:seed`)
5. **Build Command** default `next build` OK.
6. Klik **Deploy**.

Selepas deploy berjaya:

- Setting → Domains → kekalkan domain `*.vercel.app` (percuma) atau tambah domain
  pejabat sendiri jika ada.
- Setiap push ke `main` akan auto-deploy.

> **Nota TZ**: Vercel runtime UTC. Sistem ini fix `Asia/Kuala_Lumpur` di lapisan paparan
> (`lib/dates.ts`). Tiada konfigurasi tambahan diperlukan.

---

## D. Pengurusan pengguna

Selepas log masuk sebagai Admin, pergi ke **Admin → Pengurusan Pengguna**:

| Tindakan | Cara |
|----------|------|
| Tambah pengguna | Form di sebelah kanan (ID, kata laluan awal, nama, jawatan, sektor, peranan) |
| Reset kata laluan | Butang **Reset PW** pada baris pengguna |
| Nyahaktif / Aktifkan | Butang **Nyahaktif** / **Aktifkan** |

**Tiada pendaftaran sendiri** — semua akaun mesti dicipta oleh Admin. Tiada email diperlukan.

### Alternatif: tambah pengguna dari CLI

```bash
npm run db:create-user -- <username> <password> <nama> "<jawatan>" <SEKTOR_CODE> [Admin|Pengguna]
# contoh:
npm run db:create-user -- ahmadali Pa$$word123 "Ahmad bin Ali" "PEGAWAI PEMBELAJARAN" PEMBELAJARAN Pengguna
```

Kod sektor: lihat `lib/sektors.ts` atau jadual `sektors` selepas seed.

---

## E. Import data dari sistem lama (opsyenal)

1. Buka Master Sheet lama → Tab **Pergerakan** → **File → Download → CSV**.
2. Pastikan pengguna telah dicipta (username = bahagian sebelum `@` dalam email).
3. Jalankan:

   ```bash
   npm run db:import -- ./path/to/pergerakan.csv
   ```

Skrip akan langkau baris di mana pengguna tidak wujud atau `aktif=FALSE`.

---

## F. Sandaran (backup)

Supabase free tier sudah ada daily backup automatik (7 hari).
Untuk sandaran luar (disyorkan bulanan):

1. **Dashboard Supabase → Database → Backups → Download**.
2. Atau jalankan `pg_dump` dari mesin tempatan:

   ```bash
   pg_dump "postgres://...DATABASE_URL..." > egerak_backup_YYYY-MM-DD.sql
   ```

Simpan ke Drive PPD (folder USTP).

---

## G. Penyelesaian masalah

| Gejala | Penyelesaian |
|--------|--------------|
| `DATABASE_URL is not set` | Pastikan `.env.local` (dev) atau Vercel env (prod) ada nilai ini |
| `max clients reached` / 500 pada `/dashboard` | Tukar `DATABASE_URL` ke **Transaction pooler** port **6543** + `?pgbouncer=true`; redeploy |
| Build: `Invalid URL` / `ERR_INVALID_URL` | Jangan letak tanda `"` pada nilai `DATABASE_URL` di Vercel — tampal terus `postgresql://...` sahaja |
| `ID atau kata laluan tidak betul` (sebenarnya betul) | Mungkin `aktif=false` dalam DB; semak di Admin → Pengguna |
| Hari ini menunjukkan rekod tetapi tidak di kalendar | Tapisan sektor / toggle cuti — semak FilterBar |
| Lupa kata laluan Admin pertama | Re-seed: tukar `SEED_ADMIN_USERNAME` ke username baru atau hapus baris user di DB → `npm run db:seed` |
| Vercel build gagal kerana TZ / locale | Build dilakukan dalam runtime Node (bukan Edge). Pastikan **tiada perubahan** ke `runtime: 'edge'` |

---

## H. Fasa 2 — selepas v1

1. Jalankan migrasi baharu: `npm run db:migrate` (fail `drizzle/0001_phase2.sql`).
2. Jalankan `npm run db:seed` sekali lagi (menambah bilik Budiman & Bestari).
3. Isi dalam `.env.local` (opsyenal):
   - `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.5-flash` — draf OPR AI
   - **Gambar OPR (disyorkan):** `GAS_WEB_APP_URL` + `GAS_UPLOAD_SECRET` — lihat [`GAS_UPLOAD_SETUP.md`](GAS_UPLOAD_SETUP.md) (jika org block JSON key)
   - Alternatif Drive API: [`GOOGLE_DRIVE_SETUP.md`](GOOGLE_DRIVE_SETUP.md)
   - Sandaran: Supabase Storage (`OPR_PHOTO_STORAGE=supabase` + bucket `opr-photos`)

| Ciri | URL |
|------|-----|
| Import Rancangan CSV | `/admin/import` — lihat [`BULK_IMPORT.md`](BULK_IMPORT.md) |
| Tempahan bilik AM/PM | `/bilik` |
| OPR | `/my` → **OPR** pada rekod |

---

## I. Roadmap

- v1: log masuk, isi pergerakan, kalendar, rekod sendiri, admin pengguna.
- v2 (siap): import pukal, tempahan bilik, OPR + cetak PDF.
- v2+: Google Docs export, Gemini multimodal gambar, notifikasi email.
