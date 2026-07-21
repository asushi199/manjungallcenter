import type { HolidayRange } from "./types";

/**
 * Kalendar cuti sekolah KPM untuk Kumpulan B (termasuk Perak — rujukan PPD).
 * Kemas kini setiap tahun mengikut surat siaran / kalendar rasmi KPM.
 * @see https://www.moe.gov.my/
 *
 * Auto-sync penuh tidak tersedia — gunakan scripts/sync-holidays.ts sebagai panduan.
 */
export const SCHOOL_HOLIDAY_RANGES: HolidayRange[] = [
  // 2025 — sesi 2025/2026, Kumpulan B
  {
    start: "2025-05-29",
    end: "2025-06-09",
    name: "Cuti Penggal 1, Sesi 2025/2026",
    note: "Cuti sekolah KPM",
  },
  {
    start: "2025-09-13",
    end: "2025-09-21",
    name: "Cuti Penggal 2, Sesi 2025/2026",
    note: "Cuti sekolah KPM",
  },
  {
    start: "2025-12-20",
    end: "2026-01-11",
    name: "Cuti Akhir Persekolahan Sesi 2025/2026",
    note: "Cuti sekolah KPM",
  },
  // 2026 — Kumpulan B
  {
    start: "2026-03-21",
    end: "2026-03-29",
    name: "Cuti Penggal 1, Tahun 2026",
    note: "Cuti sekolah KPM",
  },
  {
    start: "2026-05-23",
    end: "2026-06-07",
    name: "Cuti Pertengahan Tahun 2026",
    note: "Cuti sekolah KPM",
  },
  {
    start: "2026-08-29",
    end: "2026-09-06",
    name: "Cuti Penggal 2, Tahun 2026",
    note: "Cuti sekolah KPM",
  },
  {
    start: "2026-12-05",
    end: "2026-12-31",
    name: "Cuti Akhir Persekolahan Tahun 2026",
    note: "Cuti sekolah KPM",
  },
];
