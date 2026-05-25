import type { UserPeranan } from "./roles";

/**
 * Format tarikh CSV (zon Asia/Kuala_Lumpur):
 *
 * RASMI (disyorkan): yyyy-mm-dd | yyyy-mm-dd HH:mm
 *   Tarikh sahaja → 08:00 (pergi) / 17:00 (kembali), dianggap sepanjang hari jika kedua-dua tanpa masa.
 *
 * Sandaran: d/m/yyyy atau m/d/yyyy dengan / atau - (Excel); sistem teka jika hari > 12.
 *   Elakkan untuk rancangan tahunan — guna ISO.
 */
export type CsvRow = Record<string, string>;

/** Untuk amaran import: adakah sel guna format bertukar (contoh 6/14/2026)? */
export function csvDateUsesAmbiguousSlashFormat(raw: string): boolean {
  const s = raw.trim();
  if (!s || /^\d{4}-\d{2}-\d{2}/.test(s)) return false;
  return /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.test(s);
}

function stripBom(s: string): string {
  return s.replace(/^\uFEFF/, "");
}

export function parseCsv(text: string): CsvRow[] {
  const lines = stripBom(text).replace(/\r/g, "").split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]).map((h) => stripBom(h.trim().toLowerCase()));
  return lines
    .slice(1)
    .map((line) => {
      const cells = splitCsvLine(line);
      const row: CsvRow = {};
      headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
      return row;
    })
    .filter((row) => {
      const email = (row.email ?? "").trim();
      return !email.startsWith("#");
    });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inside = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inside && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inside = !inside;
    } else if (ch === "," && !inside) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export function normalizeSektorCode(s: string): string {
  return s
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[()]/g, "");
}

/**
 * Excel biasanya eksport m/d/yyyy (contoh 6/14/2026 = 14 Jun).
 * Jika satu bahagian > 12, anggap bahagian itu hari (d/m).
 */
export function resolveDayMonth(first: number, second: number): { dd: number; mm: number } | null {
  if (second > 12) return { mm: first, dd: second };
  if (first > 12) return { dd: first, mm: second };
  if (first <= 12 && second <= 12) return { mm: first, dd: second };
  return null;
}

function dateFromParts(
  dd: number,
  mm: number,
  yyyy: string,
  hh = "08",
  mi = "00",
): Date | null {
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const d = new Date(
    `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}T${hh.padStart(2, "0")}:${mi.padStart(2, "0")}:00+08:00`,
  );
  return isNaN(d.getTime()) ? null : d;
}

export function parseFlexibleDate(s: string): Date | null {
  if (!s) return null;
  const raw = s.trim();
  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (slash) {
    const [, p1, p2, yyyy, hh = "8", mi = "0"] = slash;
    const parts = resolveDayMonth(Number(p1), Number(p2));
    if (!parts) return null;
    return dateFromParts(parts.dd, parts.mm, yyyy, hh, mi);
  }
  if (/^\d{4}-\d{2}-\d{2}(?:\s+\d{1,2}:\d{2})?$/.test(raw)) {
    const [datePart, timePart] = raw.split(/\s+/);
    const time = timePart ?? "08:00";
    return new Date(`${datePart}T${time}:00+08:00`);
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d;
  return null;
}

function hasExplicitTime(s: string): boolean {
  return /(\d{1,2}:\d{2})|(\d{1,2}\s*(am|pm))/i.test(s.trim());
}

/** Parse satu lajur tarikh CSV; `start` = 08:00, `end` = 17:00 jika tarikh sahaja. */
export function parseCsvDateTime(
  s: string,
  role: "start" | "end",
): { at: Date; dateOnly: boolean } | null {
  const raw = s.trim();
  if (!raw) return null;
  const defaultTime = role === "start" ? "08:00" : "17:00";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { at: new Date(`${raw}T${defaultTime}:00+08:00`), dateOnly: true };
  }

  const slashOnly = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashOnly) {
    const [, p1, p2, yyyy] = slashOnly;
    const parts = resolveDayMonth(Number(p1), Number(p2));
    if (!parts) return null;
    const [hh, mi] = defaultTime.split(":");
    const at = dateFromParts(parts.dd, parts.mm, yyyy, hh, mi);
    if (!at) return null;
    return { at, dateOnly: true };
  }

  const at = parseFlexibleDate(raw);
  if (!at) return null;
  return { at, dateOnly: !hasExplicitTime(raw) };
}

/**
 * Julat tarikh dari CSV. Jika kedua-dua lajur tarikh sahaja (tanpa masa) → `fullDay` untuk tempahan bilik.
 */
export function parseCsvDateRange(
  pergiRaw: string,
  kembaliRaw: string,
): { pergi: Date; kembali: Date; fullDay: boolean } | null {
  const pergi = parseCsvDateTime(pergiRaw, "start");
  const kembali = parseCsvDateTime(kembaliRaw, "end");
  if (!pergi || !kembali) return null;
  return {
    pergi: pergi.at,
    kembali: kembali.at,
    fullDay: pergi.dateOnly && kembali.dateOnly,
  };
}

export function resolveUsername(row: CsvRow): string {
  const email = (row.email ?? row["e-mel"] ?? "").toLowerCase();
  if (email.includes("@")) return email.split("@")[0];
  return (row.username ?? row.id ?? "").trim().toLowerCase();
}

export function mapJenis(raw: string): "Pergerakan" | "Bercuti" {
  const j = raw.toLowerCase();
  if (j.includes("cuti") || j.includes("bercuti")) return "Bercuti";
  return "Pergerakan";
}

/** Tafsiran peranan dari lajur CSV (BM / kod sistem). */
export function mapPerananCsv(raw: string): UserPeranan | null {
  const t = raw.trim();
  if (!t) return "Pengguna";
  const norm = t.toLowerCase().replace(/\s+/g, "_");
  const aliases: Record<string, UserPeranan> = {
    admin: "Admin",
    pentadbir: "Admin",
    penyelia: "Penyelia",
    timbalan_ppd: "Timbalan_PPD",
    timbalan: "Timbalan_PPD",
    ketua_unit: "Ketua_Unit",
    ketua: "Ketua_Unit",
    pengguna: "Pengguna",
  };
  if (aliases[norm]) return aliases[norm];
  const exact: UserPeranan[] = [
    "Admin",
    "Penyelia",
    "Timbalan_PPD",
    "Ketua_Unit",
    "Pengguna",
  ];
  if ((exact as readonly string[]).includes(t)) return t as UserPeranan;
  return null;
}

/** Kod sektor dipisahkan koma/semicolon (untuk laporan Timbalan). */
export function parseSektorCodeList(raw: string): string[] {
  return raw
    .split(/[,;]/)
    .map((s) => normalizeSektorCode(s))
    .filter(Boolean);
}
