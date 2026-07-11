import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ============================================================
// AI provider config (OpenAI vs Lovable AI Gateway)
// Super admin dapat menyimpan OPENAI_API_KEY & provider pilihan
// di tabel app_settings. Bila tidak ada, fallback ke env / Lovable.
// ============================================================

type AiConfig = {
  provider: "auto" | "openai" | "lovable";
  openaiKey: string | null;
  openaiModel: string;
  lovableKey: string | null;
};

async function loadAiConfig(): Promise<AiConfig> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("key,value")
    .in("key", ["ai_provider", "openai_api_key", "openai_model"]);
  const map = new Map((data ?? []).map((r) => [r.key, r.value ?? ""]));
  const provider = (map.get("ai_provider") || "auto") as AiConfig["provider"];
  const dbOpenai = map.get("openai_api_key") || "";
  return {
    provider,
    openaiKey: dbOpenai || process.env.OPENAI_API_KEY || null,
    openaiModel: map.get("openai_model") || "gpt-4o-mini",
    lovableKey: process.env.LOVABLE_API_KEY || null,
  };
}

async function chatComplete(
  cfg: AiConfig,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts: { json?: boolean } = {},
): Promise<string> {
  const tryOpenAI = async () => {
    if (!cfg.openaiKey) throw new Error("OPENAI_API_KEY tidak dikonfigurasi");
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.openaiKey}` },
      body: JSON.stringify({
        model: cfg.openaiModel,
        temperature: 0.4,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        messages,
      }),
    });
    if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
    const j = await resp.json() as { choices?: { message?: { content?: string } }[] };
    return j.choices?.[0]?.message?.content ?? "";
  };
  const tryLovable = async () => {
    if (!cfg.lovableKey) throw new Error("LOVABLE_API_KEY tidak tersedia");
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.lovableKey}` },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages }),
    });
    if (!resp.ok) throw new Error(`Lovable AI ${resp.status}`);
    const j = await resp.json() as { choices?: { message?: { content?: string } }[] };
    return j.choices?.[0]?.message?.content ?? "";
  };

  if (cfg.provider === "openai") return tryOpenAI();
  if (cfg.provider === "lovable") return tryLovable();
  if (cfg.openaiKey) {
    try { return await tryOpenAI(); } catch (e) {
      console.warn("OpenAI gagal, fallback Lovable AI", e);
      return tryLovable();
    }
  }
  return tryLovable();
}

async function assertSuperAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId, _role: "super_admin",
  });
  if (error || !data) throw new Error("Forbidden: hanya super_admin");
}

export const getAiSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const cfg = await loadAiConfig();
    return {
      provider: cfg.provider,
      openaiModel: cfg.openaiModel,
      hasOpenaiKey: !!cfg.openaiKey,
      openaiKeyMasked: cfg.openaiKey ? `${cfg.openaiKey.slice(0, 7)}…${cfg.openaiKey.slice(-4)}` : null,
      openaiKeySource: cfg.openaiKey
        ? (process.env.OPENAI_API_KEY && cfg.openaiKey === process.env.OPENAI_API_KEY ? "env" : "database")
        : null,
      hasLovableKey: !!cfg.lovableKey,
    };
  });

const SaveAiInput = z.object({
  provider: z.enum(["auto", "openai", "lovable"]),
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().optional(),
  clearOpenaiKey: z.boolean().optional(),
});

export const saveAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveAiInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const rows: { key: string; value: string | null; updated_by: string; updated_at: string }[] = [
      { key: "ai_provider", value: data.provider, updated_by: context.userId, updated_at: now },
    ];
    if (data.openaiModel !== undefined) {
      rows.push({ key: "openai_model", value: data.openaiModel || "gpt-4o-mini", updated_by: context.userId, updated_at: now });
    }
    if (data.clearOpenaiKey) {
      rows.push({ key: "openai_api_key", value: null, updated_by: context.userId, updated_at: now });
    } else if (data.openaiApiKey && data.openaiApiKey.trim()) {
      rows.push({ key: "openai_api_key", value: data.openaiApiKey.trim(), updated_by: context.userId, updated_at: now });
    }
    const { error } = await supabaseAdmin.from("app_settings").upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });



const AnalyzeInput = z.object({ laporanId: z.string().uuid() });

const AnalysisSchema = z.object({
  ringkasan: z.coerce.string().min(1).catch("Ringkasan belum tersedia."),
  isu_menonjol: z.coerce.string().min(1).catch("Isu menonjol belum teridentifikasi."),
  potensi_kerawanan: z.coerce.string().min(1).catch("Potensi kerawanan perlu pendalaman lanjutan."),
  rekomendasi: z.coerce.string().min(1).catch("Lakukan monitoring, verifikasi lapangan, dan koordinasi lintas fungsi."),
  prediksi: z.coerce.string().min(1).catch("Situasi diperkirakan tetap perlu dipantau secara berkala."),
  sentimen: z.enum(["positif", "netral", "negatif"]).catch("netral"),
  risiko: z.enum(["rendah", "sedang", "tinggi", "kritis"]).catch("sedang"),
});

type AnalysisOutput = z.infer<typeof AnalysisSchema>;

function extractJsonObject(text: string) {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const candidates = [cleaned, start >= 0 && end > start ? cleaned.slice(start, end + 1) : ""].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function normalizeAnalysis(value: unknown, fallbackSummary: string): AnalysisOutput {
  const parsed = AnalysisSchema.safeParse(value ?? {});
  if (parsed.success) return parsed.data;

  return AnalysisSchema.parse({ ringkasan: fallbackSummary });
}

export const analyzeLaporan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const { data: lap, error } = await context.supabase
      .from("laporan").select("*").eq("id", data.laporanId).single();
    if (error || !lap) throw new Error("Laporan tidak ditemukan");

    const { createLovableAi } = await import("./ai-gateway.server");
    const ai = createLovableAi(key);

    const prompt = `Anda adalah analis intelijen TOC Sat Bantek Polri. Analisis laporan berikut dan berikan output JSON.

JUDUL: ${lap.judul}
JENIS: ${lap.jenis}
POLDA: ${lap.polda ?? "-"} | WILAYAH: ${lap.wilayah ?? "-"} | LOKASI: ${lap.lokasi ?? "-"}
URGENSI INPUT: ${lap.urgensi}
TANGGAL KEJADIAN: ${lap.tanggal_kejadian ?? "-"}

ISI LAPORAN:
${lap.isi}

Berikan analisis ringkas, profesional, dalam Bahasa Indonesia.`;

    const { generateText } = await import("ai");
    const fallbackSummary = `${lap.judul}. ${String(lap.isi ?? "").slice(0, 260)}`.trim();

    let out: AnalysisOutput;
    try {
      const { text } = await generateText({
        model: ai("google/gemini-3-flash-preview"),
        prompt: prompt + `\n\nBalas HANYA JSON valid tanpa markdown dengan field berikut:
{
  "ringkasan": "2-4 kalimat ringkas",
  "isu_menonjol": "isu utama",
  "potensi_kerawanan": "potensi kerawanan kamtibmas",
  "rekomendasi": "langkah taktis",
  "prediksi": "prediksi perkembangan situasi",
  "sentimen": "positif|netral|negatif",
  "risiko": "rendah|sedang|tinggi|kritis"
}`,
      });

      out = normalizeAnalysis(extractJsonObject(text), text.trim() || fallbackSummary);
    } catch (error) {
      console.error("AI analysis generation failed", error);
      out = normalizeAnalysis(null, fallbackSummary || "Analisis dasar dibuat dari laporan karena respons AI tidak dapat diproses.");
    }


    const { data: inserted, error: insErr } = await context.supabase
      .from("ai_analyses")
      .insert({
        laporan_id: data.laporanId,
        ringkasan: out.ringkasan,
        isu_menonjol: out.isu_menonjol,
        potensi_kerawanan: out.potensi_kerawanan,
        rekomendasi: out.rekomendasi,
        prediksi: out.prediksi,
        sentimen: out.sentimen,
        risiko: out.risiko,
        raw_json: out as never,
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);
    return inserted;
  });

const ChatInput = z.object({ message: z.string().min(1).max(2000) });

export const chatAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    // Load recent history + context data
    const [{ data: history }, { data: lapStat }, { data: recentLap }] = await Promise.all([
      context.supabase
        .from("ai_chat_messages")
        .select("role,content")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true })
        .limit(20),
      context.supabase
        .from("laporan")
        .select("jenis,urgensi,polda,judul,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("laporan")
        .select("judul,jenis,polda,urgensi,created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const systemContext = `Anda adalah AI Asisten TOC Sat Bantek Polri. Jawab dalam Bahasa Indonesia, ringkas dan profesional.
Data sistem saat ini:
- Total laporan terbaru: ${lapStat?.length ?? 0}
- 10 laporan terakhir: ${JSON.stringify(recentLap ?? [])}`;

    await context.supabase.from("ai_chat_messages").insert({
      user_id: context.userId, role: "user", content: data.message,
    });

    const { generateText } = await import("ai");
    const { createLovableAi } = await import("./ai-gateway.server");
    const ai = createLovableAi(key);

    const { text } = await generateText({
      model: ai("google/gemini-3-flash-preview"),
      system: systemContext,
      messages: [
        ...(history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content: data.message },
      ],
    });

    await context.supabase.from("ai_chat_messages").insert({
      user_id: context.userId, role: "assistant", content: text,
    });

    return { reply: text };
  });

export const generateAutoReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ periode: z.enum(["harian","mingguan","bulanan","khusus"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const days = data.periode === "harian" ? 1 : data.periode === "mingguan" ? 7 : data.periode === "bulanan" ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: laps } = await context.supabase
      .from("laporan").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(200);

    const { generateText } = await import("ai");
    const { createLovableAi } = await import("./ai-gateway.server");
    const ai = createLovableAi(key);

    const prompt = `Buat LAPORAN ${data.periode.toUpperCase()} situasi kamtibmas berdasarkan ${laps?.length ?? 0} laporan masuk dalam ${days} hari terakhir. Format:

I. PENDAHULUAN
II. SUMBER DATA
III. RINGKASAN SITUASI
IV. FAKTA-FAKTA
V. ANALISIS AI
VI. PREDIKSI KERAWANAN
VII. REKOMENDASI
VIII. KESIMPULAN

Data laporan: ${JSON.stringify(laps?.slice(0, 80) ?? [])}

Tulis dalam Bahasa Indonesia resmi, ringkas tapi lengkap, gunakan poin-poin bila perlu.`;

    const { text } = await generateText({
      model: ai("google/gemini-3-flash-preview"),
      prompt,
    });

    const judul = `Laporan ${data.periode === "harian" ? "Harian" : data.periode === "mingguan" ? "Mingguan" : data.periode === "bulanan" ? "Bulanan" : "Khusus"} — ${new Date().toLocaleDateString("id-ID")}`;
    const { data: rep, error } = await context.supabase.from("generated_reports").insert({
      judul,
      periode: data.periode,
      tanggal_mulai: since.split("T")[0],
      tanggal_selesai: new Date().toISOString().split("T")[0],
      konten: text,
      ringkasan: text.slice(0, 400),
      metadata: { total_laporan: laps?.length ?? 0 } as never,
      created_by: context.userId,
    }).select().single();
    if (error) throw new Error(error.message);
    return rep;
  });

export const analyzePetaOperasional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: laps } = await context.supabase
      .from("laporan")
      .select("polda,wilayah,urgensi,jenis,judul,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    const rows = laps ?? [];
    const perPolda: Record<string, number> = {};
    const perUrgensi: Record<string, number> = {};
    const perJenis: Record<string, number> = {};
    for (const r of rows) {
      if (r.polda) perPolda[r.polda] = (perPolda[r.polda] ?? 0) + 1;
      if (r.urgensi) perUrgensi[r.urgensi] = (perUrgensi[r.urgensi] ?? 0) + 1;
      if (r.jenis) perJenis[r.jenis] = (perJenis[r.jenis] ?? 0) + 1;
    }
    const topPolda = Object.entries(perPolda).sort((a,b) => b[1]-a[1]).slice(0, 10);

    const prompt = `Anda analis intelijen TOC Sat Bantek Polri. Analisis sebaran laporan operasional 30 hari terakhir berdasarkan peta Indonesia.

TOTAL LAPORAN: ${rows.length}
SEBARAN PER POLDA (top 10): ${JSON.stringify(topPolda)}
DISTRIBUSI URGENSI: ${JSON.stringify(perUrgensi)}
DISTRIBUSI JENIS: ${JSON.stringify(perJenis)}
10 LAPORAN TERBARU: ${JSON.stringify(rows.slice(0,10).map(r => ({ judul: r.judul, polda: r.polda, urgensi: r.urgensi })))}

Berikan analisis dalam Bahasa Indonesia, format markdown ringkas dengan bagian:
**Ringkasan Situasi**, **Wilayah Rawan**, **Pola & Tren**, **Potensi Eskalasi**, **Rekomendasi Taktis**.`;

    const { generateText } = await import("ai");
    const { createLovableAi } = await import("./ai-gateway.server");
    const ai = createLovableAi(key);

    const { text } = await generateText({
      model: ai("google/gemini-3-flash-preview"),
      prompt,
    });

    return {
      analisis: text,
      total: rows.length,
      topPolda,
      perUrgensi,
      generatedAt: new Date().toISOString(),
    };
  });

const NarasiInput = z.object({
  judul: z.string().min(1),
  isi: z.string().min(1),
  meta: z.record(z.string(), z.string()).optional(),
});

export const generateLaporanNarasi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => NarasiInput.parse(d))
  .handler(async ({ data }) => {
    const cfg = await loadAiConfig();
    const metaStr = data.meta
      ? Object.entries(data.meta).map(([k, v]) => `${k}: ${v}`).join("\n")
      : "";

    const isi = (data.isi ?? "").slice(0, 2500);
    const prompt = `Anda analis intelijen TOC Sat Bantek Polri. Berdasarkan fakta laporan, susun dua bagian narasi resmi.

JUDUL: ${data.judul}
${metaStr}

FAKTA-FAKTA:
${isi}

Tugas:
1. ANALISA — 3-5 kalimat: situasi, faktor penyebab, dampak, potensi eskalasi.
2. CATATAN — 2-3 kalimat: langkah pengawasan, koordinasi, rekomendasi taktis.

Balas HANYA JSON valid tanpa markdown:
{"analisa":"...","catatan":"..."}`;

    let analisa = "Berdasarkan fakta-fakta di atas, dilakukan analisa lebih lanjut terkait situasi dan dampak kejadian.";
    let catatan = "Perlu tindak lanjut dan pemantauan berkelanjutan terhadap kejadian ini.";

    try {
      const text = await chatComplete(cfg, [
        { role: "system", content: "Anda analis intelijen Polri. Jawab ringkas, profesional, Bahasa Indonesia. Output WAJIB JSON valid." },
        { role: "user", content: prompt },
      ], { json: true });

      const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
      const s = cleaned.indexOf("{");
      const e = cleaned.lastIndexOf("}");
      const jsonStr = s >= 0 && e > s ? cleaned.slice(s, e + 1) : cleaned;
      const parsed = JSON.parse(jsonStr) as { analisa?: string; catatan?: string };
      if (parsed.analisa && typeof parsed.analisa === "string") analisa = parsed.analisa.trim();
      if (parsed.catatan && typeof parsed.catatan === "string") catatan = parsed.catatan.trim();
    } catch (err) {
      console.error("generateLaporanNarasi failed", err);
    }

    return { analisa, catatan };
  });


