const SYSTEM_PROMPT = `Anda ialah Pegawai Kanan Pejabat Pendidikan Daerah (PPD) yang sangat berpengalaman dan mahir dalam operasi, terminologi, dan KPI semua sektor di bawah Kementerian Pendidikan Malaysia (KPM).

LANGKAH BERFIKIR (mandatory, dalaman):
1) Analisis Nama Program + Maklumat Tambahan + Sasaran + Nota Pegawai untuk menyimpulkan sektor / unit.
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

export type OprAiResult = { dapatan: string; rumusan: string; refleksi: string };

/** @deprecated Guna OprAiResult */
export type GeminiOprResult = OprAiResult;

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

export function buildFallbackOpr(input: OprPromptInput): OprAiResult {
  return {
    dapatan: `- Aktiviti "${input.urusan}" telah dilaksanakan di ${input.lokasi || "lokasi program"}.\n- Penyertaan sasaran (${input.sasaran || "pegawai berkenaan"}) mencapai tahap memuaskan.\n- ${input.maklumatTambahan || "Tiada isu kritikal dilaporkan."}`,
    rumusan: `Program ini menyokong objektif sektor ${input.sektor} dan memberi impak positif kepada pelaksanaan tugas PPD Manjung.`,
    refleksi: `Kekuatan: pelaksanaan teratur. Penambahbaikan: perancangan awal boleh diperkemas. Tindakan susulan: dokumentasi lengkap dan susulan dalam mesyuarat sektor.`,
  };
}

export type OprGenerateOutcome = {
  draft: OprAiResult;
  /** Mesej ringkas untuk paparan UI */
  notice: string;
};

/** @deprecated Guna OprGenerateOutcome */
export type GeminiGenerateOutcome = OprGenerateOutcome;

type ProviderAttempt =
  | { ok: true; draft: OprAiResult }
  | { ok: false; quota: boolean; detail: string };

function isQuotaOrRateLimitError(detail: string): boolean {
  const d = detail.toLowerCase();
  return (
    d.includes("quota") ||
    d.includes("rate limit") ||
    d.includes("rate-limit") ||
    d.includes("rate_limit") ||
    d.includes("resource_exhausted") ||
    d.includes("429") ||
    d.includes("too many requests")
  );
}

function stripJsonFence(text: string): string {
  return text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
}

function parseOprJson(text: string): OprAiResult | null {
  const cleaned = stripJsonFence(text);
  try {
    const parsed = JSON.parse(cleaned) as OprAiResult;
    return {
      dapatan: String(parsed.dapatan ?? ""),
      rumusan: String(parsed.rumusan ?? ""),
      refleksi: String(parsed.refleksi ?? ""),
    };
  } catch {
    return null;
  }
}

async function generateWithGroq(input: OprPromptInput): Promise<ProviderAttempt> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, quota: false, detail: "GROQ_API_KEY tidak ditetapkan" };
  }

  const model = (process.env.GROQ_MODEL || "llama-3.3-70b-versatile").trim();
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
      temperature: 0.3,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    const detail =
      json?.error?.message ||
      json?.error?.type ||
      (typeof json === "object" ? JSON.stringify(json) : String(json));
    return { ok: false, quota: isQuotaOrRateLimitError(detail), detail };
  }

  const text = json?.choices?.[0]?.message?.content ?? "";
  const draft = parseOprJson(text);
  if (!draft) {
    return { ok: false, quota: false, detail: "Respons JSON tidak sah" };
  }
  return { ok: true, draft };
}

async function generateWithGemini(input: OprPromptInput): Promise<ProviderAttempt> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, quota: false, detail: "GEMINI_API_KEY tidak ditetapkan" };
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
    return { ok: false, quota: isQuotaOrRateLimitError(detail), detail };
  }

  const text =
    json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") ?? "";
  const draft = parseOprJson(text);
  if (!draft) {
    return { ok: false, quota: false, detail: "Respons JSON tidak sah" };
  }
  return { ok: true, draft };
}

/** Groq (utama) → Gemini (sandaran) → draf templat. */
export async function generateOprWithAi(input: OprPromptInput): Promise<OprGenerateOutcome> {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (groqKey) {
    const groq = await generateWithGroq(input);
    if (groq.ok) {
      return {
        draft: groq.draft,
        notice: "Dijana AI – sila semak sebelum muktamad.",
      };
    }

    if (geminiKey) {
      const gemini = await generateWithGemini(input);
      if (gemini.ok) {
        return {
          draft: gemini.draft,
          notice: groq.quota
            ? "Groq tidak tersedia — draf dijana dengan Gemini. Sila semak sebelum muktamad."
            : "Dijana AI (Gemini) – sila semak sebelum muktamad.",
        };
      }
      if (!gemini.quota) {
        throw new Error(`Gemini API: ${gemini.detail}`);
      }
      return {
        draft: buildFallbackOpr(input),
        notice:
          "Kuota AI (Groq & Gemini) habis. Draf asas diisi secara automatik — sila semak & edit.",
      };
    }

    if (groq.quota) {
      return {
        draft: buildFallbackOpr(input),
        notice: "Kuota Groq habis. Draf asas diisi secara automatik — sila semak & edit.",
      };
    }
    throw new Error(`Groq API: ${groq.detail}`);
  }

  if (geminiKey) {
    const gemini = await generateWithGemini(input);
    if (gemini.ok) {
      return {
        draft: gemini.draft,
        notice: "Dijana AI – sila semak sebelum muktamad.",
      };
    }
    if (!gemini.quota) {
      throw new Error(`Gemini API: ${gemini.detail}`);
    }
    return {
      draft: buildFallbackOpr(input),
      notice:
        "Kuota Gemini habis. Draf asas diisi secara automatik — sila semak & edit. Pertimbang GROQ_API_KEY (percuma) di Vercel.",
    };
  }

  return {
    draft: buildFallbackOpr(input),
    notice: "Mod manual (GROQ_API_KEY / GEMINI_API_KEY tidak ditetapkan).",
  };
}

/** @deprecated Guna generateOprWithAi */
export const generateOprWithGemini = generateOprWithAi;
