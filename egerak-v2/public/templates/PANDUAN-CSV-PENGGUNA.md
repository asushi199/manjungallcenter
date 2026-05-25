# Import Pengguna (CSV) — Panduan Pentadbir

**Admin → Pengurusan Pengguna → Import CSV**

## Peraturan

| Perkara | Peraturan |
|---------|-----------|
| Username sudah wujud | **Kemas kini** nama, jawatan, sektor, peranan (kata laluan **tidak** ditukar) |
| Username baharu | Dicipta dengan **kata laluan lalai** yang pentadbir isi dalam borang import |
| Login pertama | Pengguna baharu mesti **tukar kata laluan** |
| Baris `#NOTA` | Dilangkau |

## Lajur

| Lajur | Wajib | Contoh |
|-------|-------|--------|
| `username` | Ya* | `ahmad.ali` |
| `email` | Ya* | `ahmad.ali@moe-dl.edu.my` → username = `ahmad.ali` |
| `nama` | Ya | `Ahmad bin Ali` |
| `jawatan` | Tidak | `GPK` |
| `sektor` | Tidak* | `USTP`, `PEMBELAJARAN` (kod sistem) |
| `peranan` | Tidak | Kosong = `Pengguna`; `Ketua_Unit`, `Timbalan_PPD`, `Penyelia`, `Admin` |
| `laporan_sektor` | Timbalan sahaja | `PEMBELAJARAN,PENTAKSIRAN` |

\* Salah satu `username` atau `email`. \* Wajib untuk `Ketua_Unit`.

## Kod sektor (contoh)

`PERANCANGAN`, `PENGURUSAN_SEKOLAH`, `PEMBANGUNAN_MURID`, `PENTAKSIRAN`, `PSIKOLOGI_KAUNSELING`, `PENGURUSAN`, `USTP`, `PEMBELAJARAN`, `PPD_PENTADBIRAN` (hanya Penyelia)

## Excel

1. Simpan sebagai **CSV UTF-8**
2. Baris pertama = header tepat seperti template
3. Jangan ubah nama lajur

## Selepas import

- Semak jadual keputusan (OK / Dikemas kini / Ralat)
- Beritahu pegawai baharu: ID login + kata laluan lalai
- Import **Rancangan** (`/admin/import`) perlukan akaun sudah wujud
