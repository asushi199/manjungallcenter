import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const files = [
  "app/global-error.tsx",
  "app/(app)/error.tsx",
  "app/(app)/dashboard/error.tsx",
  "app/(app)/dashboard/DashboardMain.tsx",
  "app/(app)/dashboard/DashboardTodayStats.tsx",
  "app/(app)/admin/import/page.tsx",
  "app/(app)/admin/laporan-opr/LaporanOprClient.tsx",
  "app/(app)/admin/laporan-opr/page.tsx",
  "app/(app)/admin/pergerakan/page.tsx",
  "app/(app)/jejak-pegawai/JejakPegawaiClient.tsx",
  "app/(app)/my/page.tsx",
  "app/(app)/my/MyClient.tsx",
  "app/(app)/new/page.tsx",
  "app/(app)/my/[id]/edit/page.tsx",
  "app/(app)/my/[id]/opr/OprFormClient.tsx",
  "app/(app)/my/[id]/opr/OprPhotoGallery.tsx",
  "app/(app)/takwim/TakwimClient.tsx",
];

const storageSource = readFileSync("lib/storage.ts", "utf8");
const storageHintSource =
  storageSource.match(/export function getStorageSetupHint\(\): string \{[\s\S]*?\n\}/)?.[0] ?? "";
const source = [...files.map((file) => readFileSync(file, "utf8")), storageHintSource].join("\n");

test("public UI copy does not expose implementation details or tutorial-style helper text", () => {
  [
    "cold start",
    "DATABASE_URL",
    "Vercel",
    "docs/BULK_IMPORT.md",
    "docs/GAS_UPLOAD_SETUP.md",
    "GAS_WEB_APP_URL",
    "GAS_UPLOAD_SECRET",
    "Supabase Storage",
    "Google Apps Script",
    "Apps Script",
    "Sambungan DB",
    "pangkalan data mungkin sejuk",
    "Paparan ringkas aktiviti sektor",
    "Klik aktiviti",
    "Klik untuk lihat",
    "Klik bulan untuk lihat rekod",
    "Juga boleh klik tajuk",
    "klik hari",
    "Petua: klik tajuk sektor",
    "Hanya status Siap dipaparkan",
    "Gunakan pemilih di atas",
    "Maklumat pegawai akan diambil",
    "warna mengikut sektor",
    "Tidak perlu OPR?",
    "Tapisan aktiviti yang bertindih",
    "Bahagian ini akan diisi selepas",
    "Mengikut profil pegawai",
    "Dimampatkan automatik",
    "gambar disusun menegak",
  ].forEach((text) => assert.doesNotMatch(source, new RegExp(text)));
});
