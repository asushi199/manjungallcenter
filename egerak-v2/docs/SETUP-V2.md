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

Supabase **percuma** tidak menyediakan sandaran harian automatik (itu pelan Pro). Guna sandaran dalam sistem:

1. Log masuk Admin → **Sandaran Data** (`/admin/sandaran`).
2. **Muat turun sekarang** — fail `.json.gz` ke komputer. Simpan di folder selamat pejabat.
3. **Simpan ke Drive pejabat** — jika GAS sudah dikonfigurasi (subfolder `sandaran`). Fail **tidak** dikongsi pautan awam.
4. **Sandaran automatik** — hidupakan di halaman yang sama (harian atau mingguan). Vercel Cron memanggil `/api/cron/backup` setiap hari 02:00 MYT (`0 18 * * *` UTC).

Tetapkan `CRON_SECRET` di Vercel (dan `.env.local` jika uji cron tempatan):

```
Authorization: Bearer <CRON_SECRET>
```

Fail sandaran mengandungi hash kata laluan. Jangan email atau kongsi pautan awam.

### Sandaran SQL penuh (`pg_dump`, bulanan)

Untuk sandaran SQL mentah (`pg_dump`), guna Direct connection port **5432** (bukan pooler 6543):

```powershell
npm run db:backup-pgdump
npm run db:backup-pgdump:upload
```

**Automatik bulanan (disyorkan):** GitHub → Settings → Secrets → Actions — set
`PGDUMP_DATABASE_URL`, `GAS_WEB_APP_URL`, `GAS_UPLOAD_SECRET`. Jalankan workflow
**Sandaran pg_dump bulanan** (`.github/workflows/backup-pgdump-monthly.yml`) atau
**Run workflow** dari tab Actions. Fail `.sql.gz` ke `_backup/pgdump/tahun/bulan` di Drive.

**Sandaran ≠ padam data** — buat backup sebelum reset beta jika mungkin.

### Kosongkan data ujian beta (platform bersih)

**Padam di UI (Pergerakan Saya / Admin Padam)** hanya *soft delete* (`aktif=false`) — rekod masih dalam DB.

Untuk **padam kekal** semua pergerakan, OPR, tempahan bilik, import & `audit_log`:

```bash
cd egerak-v2
npm run db:reset-beta -- --confirm
```

- **Kekal:** `sektors`, `rooms`, semua `users` (akaun sedia ada).
- **Tidak dipadam:** fail gambar di Google Drive (bersihkan folder Drive secara manual jika perlu).

Jika mahu buang akaun ujian dan kekal satu admin sahaja:

```bash
npm run db:reset-beta -- --confirm --purge-users
npm run db:seed
```

Pastikan `DATABASE_URL` dalam `.env.local` menunjuk ke DB yang betul (prod vs dev).

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
