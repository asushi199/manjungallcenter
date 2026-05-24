# eGerak Master Spreadsheet — Skema

## Users

| Lajur | Jenis | Contoh |
|-------|--------|--------|
| email | text | pegawai@ppdmanjung.edu.my |
| nama | text | EN. CONTOH |
| jawatan | text | PENOLONG PPD ... |
| sektor | text | UNIT SUMBER TEKNOLOGI PENDIDIKAN (USTP) |
| peranan | text | Pengguna / Admin / Pentadbir |
| aktif | TRUE/FALSE | TRUE |

## Pergerakan

| Lajur | Keterangan |
|-------|------------|
| id | ID unik (auto) |
| timestamp | Masa rekod |
| email, nama, jawatan, sektor | Pegawai |
| jenis | Pergerakan Biasa / Bercuti |
| urusan | Tujuan aktiviti |
| lokasi | Destinasi (Dewan Bestari / Bilik Budiman → tempahan) |
| tarikh_pergi, tarikh_kembali | DateTime |
| calendar_event_ids | JSON: personal, sektor, master, room, roomCalendarId |
| room_status | BOOKED / CONFLICT / kosong |
| opr_status | DRAFT / DONE |
| opr_file_url | URL Google Doc OPR |
| dapatan_draft, rumusan_draft, refleksi_draft | Teks AI / manual（dapatan、impak、refleksi/tindakan susulan） |
| source | web / bulk / form |
| aktif | TRUE / FALSE (padam lembut) |

## Rancangan_Tahunan (bulk)

| status_import | PENDING → OK / ERROR / CONFLICT |
| email … tarikh_kembali | Sama seperti pergerakan |
| nota | Mesej ralat |
| id_hasil | ID pergerakan selepas import |

## Room_Log

Audit tempahan bilik: timestamp, pergerakan_id, bilik, tarikh, event_id, status, email.

## Looker Studio

Sambung data source ke sheet **Pergerakan** (aktif=TRUE). Medan penting:

- `tarikh_pergi` → Date
- `sektor` → Dimension
- `jenis` → Filter Bercuti vs Pergerakan
- Kiraan rekod → Metric (bilangan aktiviti)
