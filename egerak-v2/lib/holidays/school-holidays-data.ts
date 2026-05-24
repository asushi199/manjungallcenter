import type { HolidayRange } from "./types";

/**
 * Kalendar cuti sekolah KPM (semua sekolah Malaysia — rujukan PPD).
 * Kemas kini setiap tahun mengikut surat siaran / kalendar rasmi KPM.
 * @see https://www.moe.gov.my/
 *
 * Auto-sync penuh tidak tersedia — gunakan scripts/sync-holidays.ts sebagai panduan.
 */
export const SCHOOL_HOLIDAY_RANGES: HolidayRange[] = [
  // 2025 — sesi 2025/2026 (anggaran ikut kalendar KPM; semak surat rasmi)
  {
    start: "2025-03-15",
    end: "2025-03-23",
    name: "Cuti Pertengahan Penggal 1",
    note: "Cuti sekolah KPM",
  },
  {
    start: "2025-05-24",
    end: "2025-06-01",
    name: "Cuti Pertengahan Tahun",
    note: "Cuti sekolah KPM",
  },
  {
    start: "2025-08-23",
    end: "2025-08-31",
    name: "Cuti Pertengahan Penggal 2",
    note: "Cuti sekolah KPM",
  },
  {
    start: "2025-11-22",
    end: "2026-01-01",
    name: "Cuti Akhir Tahun",
    note: "Cuti sekolah KPM",
  },
  // 2026 — sesi 2026/2027
  {
    start: "2026-03-14",
    end: "2026-03-22",
    name: "Cuti Pertengahan Penggal 1",
    note: "Cuti sekolah KPM",
  },
  {
    start: "2026-05-23",
    end: "2026-06-06",
    name: "Cuti Pertengahan Tahun",
    note: "Cuti sekolah KPM",
  },
  {
    start: "2026-08-22",
    end: "2026-08-30",
    name: "Cuti Pertengahan Penggal 2",
    note: "Cuti sekolah KPM",
  },
  {
    start: "2026-11-21",
    end: "2027-01-02",
    name: "Cuti Akhir Tahun",
    note: "Cuti sekolah KPM",
  },
  // 2027 — lengkapkan apabila KPM umumkan
  {
    start: "2027-03-13",
    end: "2027-03-21",
    name: "Cuti Pertengahan Penggal 1",
    note: "Cuti sekolah KPM (anggaran)",
  },
];
