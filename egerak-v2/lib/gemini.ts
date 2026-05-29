const SYSTEM_PROMPT = `Anda ialah Pegawai Kanan Pejabat Pendidikan Daerah (PPD) yang sangat berpengalaman dan mahir dalam operasi, terminologi, dan KPI semua sektor di bawah Kementerian Pendidikan Malaysia (KPM).

LANGKAH BERFIKIR (mandatory, dalaman):
1) Analisis Nama Program + Maklumat Tambahan + Sasaran untuk menyimpulkan sektor / unit.
2) Adaptasikan kosa kata dan nada sepadan dengan sektor tersebut.

BAHASA (wajib, tanpa pengecualian):
- Semua kandungan dalam JSON (dapatan, rumusan, refleksi) MESTI ditulis dalam Bahasa Melayu rasmi KPM.
- Maklumat Tambahan, Sasaran/Objektif Ringkas, dan Nota Pegawai (mentah) mungkin dalam bahasa lain (cth. Inggeris, Cina, campuran) — terjemah/ringkaskan ke BM; JANGAN salin ayat asal dalam bahasa selain BM ke dalam output.
- Jangan campur bahasa dalam laporan akhir kecuali nama khas, singkatan rasmi KPM, atau istilah teknikal yang lazim (cth. PDCA, KPI).

FORMAT: Kembalikan JSON sahaja dengan kunci dapatan, rumusan, refleksi.
- dapatan: sekurang-kurangnya 3 bullet (gunakan \\n atau " - " antara point)
- rumusan: satu perenggan kukuh
- refleksi: penilaian kritikal + 2 tindakan susulan PDCA
Jangan letak markdown atau teks luar JSON.`;

export type GeminiOprResult = { dapatan: string; rumusan: string; refleksi: string };

export type OprPromptInput = {
  nama: string;
  jawatan: string;
  sektor: string;
  urusan: string;
  lokasi: string;
  tarikh: string;
  maklumatTambahan?: string;
  sasaran?: string;
  notaPegawai?: string;
};

function buildUserPrompt(input: OprPromptInput): string {
  return [
    "DATA REKOD:",
    `Nama: ${input.nama}`,
    `Jawatan: ${input.jawatan}`,
    `Sektor: ${input.sektor}`,
    `Urusan: ${input.urusan}`,
    `Lokasi: ${input.lokasi}`,
    `Tarikh: ${input.tarikh}`,
    `Maklumat Tambahan: ${input.maklumatTambahan || "(tiada)"}`,
    `Sasaran: ${input.sasaran || "(tiada)"}`,
    `Nota Pegawai (mentah): ${input.notaPegawai || "(tiada)"}`,
    'Hasilkan JSON: { "dapatan": "...", "rumusan": "...", "refleksi": "..." }',
  ].join("\n");
}

export function buildFallbackOpr(input: OprPromptInput): GeminiOprResult {
  return {
    dapatan: `- Aktiviti "${input.urusan}" telah dilaksanakan di ${input.lokasi || "lokasi program"}.\n- Penyertaan sasaran (${input.sasaran || "pegawai berkenaan"}) mencapai tahap memuaskan.\n- ${input.maklumatTambahan || "Tiada isu kritikal dilaporkan."}`,
    rumusan: `Program ini menyokong objektif sektor ${input.sektor} dan memberi impak positif kepada pelaksanaan tugas PPD Manjung.`,
    refleksi: `Kekuatan: pelaksanaan teratur. Penambahbaikan: perancangan awal boleh diperkemas. Tindakan susulan: dokumentasi lengkap dan susulan dalam mesyuarat sektor.`,
  };
}

export type GeminiGenerateOutcome = {
  draft: GeminiOprResult;
  /** Mesej ringkas untuk paparan UI */
  notice: string;
};

function isQuotaOrRateLimitError(detail: string): boolean {
  const d = detail.toLowerCase();
  return (
    d.includes("quota") ||
    d.includes("rate limit") ||
    d.includes("rate-limit") ||
    d.includes("resource_exhausted") ||
    d.includes("429")
  );
}

export async function generateOprWithGemini(input: OprPromptInput): Promise<GeminiGenerateOutcome> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {
      draft: buildFallbackOpr(input),
      notice: "Mod manual (GEMINI_API_KEY tidak ditetapkan).",
    };
  }

  const model = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: buildUserPrompt(input) }] }],
      generationConfig: {
        maxOutputTokens: 2048,
        // OPR = penulisan/polish, bukan penaakulan kompleks.
        // Temperature rendah (0.3) = laras & tepat; thinkingBudget 0 = matikan
        // "thinking" pada Gemini 2.5 Flash untuk laju & jimat token.
        temperature: 0.3,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    const detail =
      json?.error?.message ||
      json?.error?.status ||
      (typeof json === "object" ? JSON.stringify(json) : String(json));

    if (isQuotaOrRateLimitError(detail)) {
      return {
        draft: buildFallbackOpr(input),
        notice:
          `Kuota Gemini untuk model ${model} telah habis / tidak tersedia. Draf asas diisi secara automatik — sila semak & edit. Semak GEMINI_MODEL (lalai gemini-2.5-flash) atau billing di Google AI Studio.`,
      };
    }
    throw new Error(`Gemini API: ${detail}`);
  }

  let text =
    json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") ?? "";
  text = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

  try {
    const parsed = JSON.parse(text) as GeminiOprResult;
    return {
      draft: {
        dapatan: String(parsed.dapatan ?? ""),
        rumusan: String(parsed.rumusan ?? ""),
        refleksi: String(parsed.refleksi ?? ""),
      },
      notice: "Dijana AI – sila semak sebelum muktamad.",
    };
  } catch {
    return {
      draft: buildFallbackOpr(input),
      notice: "Respons AI tidak sah — draf asas digunakan. Sila edit.",
    };
  }
}
