const SYSTEM_PROMPT = `Anda ialah Pegawai Kanan Pejabat Pendidikan Daerah (PPD) yang sangat berpengalaman dan mahir dalam operasi, terminologi, dan KPI semua sektor di bawah Kementerian Pendidikan Malaysia (KPM).

LANGKAH BERFIKIR (mandatory, dalaman):
1) Analisis Nama Program + Maklumat Tambahan + Sasaran + Nota Pegawai untuk menyimpulkan sektor / unit.
2) Adaptasikan kosa kata dan nada sepadan dengan sektor tersebut.

BAHASA (wajib, tanpa pengecualian):
- Semua kandungan dalam JSON (dapatan, rumusan, refleksi) MESTI ditulis dalam Bahasa Melayu rasmi KPM.
- Maklumat Tambahan, Sasaran/Objektif Ringkas, dan Nota Pegawai (mentah) mungkin dalam bahasa lain (cth. Inggeris, Cina, campuran) — terjemah/ringkaskan ke BM; JANGAN salin ayat asal dalam bahasa selain BM ke dalam output.
- Jangan campur bahasa dalam laporan akhir kecuali nama khas, singkatan rasmi KPM, atau istilah teknikal yang lazim (cth. PDCA, KPI).

FORMAT OUTPUT: Kembalikan JSON sahaja dengan kunci dapatan, rumusan, refleksi. Jangan letak markdown atau teks luar JSON.

=== DAPATAN (Do — pelaksanaan) ===
Tulis tepat 3 bullet (pisahkan dengan \\n, setiap baris bermula "- "):
1) Pelaksanaan: aktiviti/program, lokasi, tarikh, dan kaedah/latihan yang dijalankan (rujuk DATA REKOD).
2) Penyertaan: sasaran/kumpulan sasar, tahap penyertaan atau respons peserta (nyatakan spesifik jika ada dalam nota; jika tiada data, nyatakan secara umum tanpa angka rekaan).
3) Pemerhatian: satu isu positif ATAU cabaran khusus sektor yang berbeza daripada bullet 1–2 (rujuk Nota Pegawai jika ada).

Larangan dapatan: jangan ulang ayat sama; jangan guna frasa kosong "berjalan lancar" / "memuaskan" tanpa butiran.

=== RUMUSAN (Check ringkas — sintesis impak) ===
Satu perenggan (3–5 ayat):
- Rumuskan impak program kepada objektif sektor dan KPI KPM yang berkaitan.
- Sebut kesan kepada sasaran (guru/murid/pegawai/sekolah) secara spesifik.
- Elakkan frasa generik semata-mata ("impak positif", "berjaya") tanpa menyebut WHAT dan WHO.

=== REFLEKSI (Check + Act — PDCA) ===
WAJIB ikut struktur ini (teks dalam satu string, guna \\n antara bahagian):

Semakan: [1 ayat kekuatan spesifik berdasarkan dapatan] [1 ayat kelemahan atau isu spesifik — WAJIB ada; jangan hanya puji]

Tindakan susulan:
1. [tindakan konkrit, boleh diukur, berkait terus dengan kelemahan di atas]
2. [tindakan konkrit kedua, berbeza daripada (1)]

Larangan refleksi:
- JANGAN hanya senaraikan tindakan tanpa semakan kekuatan/kelemahan.
- JANGAN guna "perlu ada usaha berterusan" tanpa nyatakan isu spesifik.
- JANGAN salin ayat dari rumusan.

CONTOH RANGKA (adaptasi ikut DATA REKOD, jangan salin verbatim):
dapatan: "- Bengkel kesihatan mental telah dilaksanakan di SJKC X pada [tarikh] dengan fokus pengurusan stres guru.\\n- Penyertaan guru sasaran mencapai tahap memuaskan dengan engagement aktif semasa sesi.\\n- Guru masih memerlukan bimbingan berterusan untuk amalan gaya hidup sihat di luar program."
rumusan: "Program ini selaras dengan objektif sektor X dan menyokong kesejahteraan guru. Impak utama termasuk peningkatan kesedaran stres dan komitmen pengurusan sekolah untuk sokongan berterusan."
refleksi: "Semakan: Pelaksanaan teratur dan penerimaan guru baik; namun amalan harian gaya hidup sihat masih rendah dan memerlukan susulan.\\n\\nTindakan susulan:\\n1. Mengadakan sesi susulan suku tahun untuk pemantauan amalan guru.\\n2. Menyediakan platform perkongsian aktiviti suka hati dan luar bilik darjah di kalangan guru."`;

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
    'Hasilkan JSON mengikut struktur dapatan/rumusan/refleksi dalam arahan sistem. Rujuk DATA REKOD di bawah — jangan reka fakta yang tiada.',
    'Hasilkan JSON: { "dapatan": "...", "rumusan": "...", "refleksi": "..." }',
  ].join("\n");
}

export function buildFallbackOpr(input: OprPromptInput): OprAiResult {
  return {
    dapatan: `- Aktiviti "${input.urusan}" telah dilaksanakan di ${input.lokasi || "lokasi program"} pada ${input.tarikh}.\n- Penyertaan sasaran (${input.sasaran || "pegawai berkenaan"}) mencapai tahap memuaskan.\n- ${input.maklumatTambahan || input.notaPegawai || "Tiada isu kritikal dilaporkan; susulan dokumentasi perlu diperkukuh."}`,
    rumusan: `Program ini selaras dengan objektif sektor ${input.sektor} dan memberi impak kepada pelaksanaan tugas PPD Manjung. Sasaran program memperoleh manfaat berkaitan ${input.urusan}.`,
    refleksi: `Semakan: Pelaksanaan teratur dan objektif program tercapai; namun dokumentasi dan susulan jangka panjang masih perlu diperkemas.\n\nTindakan susulan:\n1. Memastikan dokumentasi lengkap dan perkongsian dalam mesyuarat sektor.\n2. Merancang aktiviti susulan untuk pemantauan impak program.`,
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
