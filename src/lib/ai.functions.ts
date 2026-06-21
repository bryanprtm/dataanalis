import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const { generateText } = await import("ai");
    const { createLovableAi } = await import("./ai-gateway.server");
    const ai = createLovableAi(key);

    const metaStr = data.meta
      ? Object.entries(data.meta).map(([k, v]) => `${k}: ${v}`).join("\n")
      : "";

    const prompt = `Anda adalah analis intelijen TOC Sat Bantek Polri. Berdasarkan fakta-fakta laporan berikut, susun dua bagian narasi untuk laporan resmi.

JUDUL: ${data.judul}
${metaStr}

FAKTA-FAKTA:
${data.isi}

Tugas:
1. ANALISA — analisa profesional 3-6 kalimat terkait situasi, faktor penyebab, dampak, serta potensi eskalasi/kerawanan berdasarkan fakta di atas.
2. CATATAN — catatan tindak lanjut 2-4 kalimat berisi langkah pengawasan, koordinasi, dan rekomendasi taktis.

Balas HANYA JSON valid tanpa markdown:
{"analisa":"...","catatan":"..."}`;

    let analisa = "Berdasarkan fakta-fakta di atas, dilakukan analisa lebih lanjut terkait situasi dan dampak kejadian.";
    let catatan = "Perlu tindak lanjut dan pemantauan berkelanjutan terhadap kejadian ini.";
    try {
      const { text } = await generateText({
        model: ai("google/gemini-3-flash-preview"),
        prompt,
      });
      const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
      const s = cleaned.indexOf("{");
      const e = cleaned.lastIndexOf("}");
      const json = s >= 0 && e > s ? cleaned.slice(s, e + 1) : cleaned;
      const parsed = JSON.parse(json) as { analisa?: string; catatan?: string };
      if (parsed.analisa && typeof parsed.analisa === "string") analisa = parsed.analisa.trim();
      if (parsed.catatan && typeof parsed.catatan === "string") catatan = parsed.catatan.trim();
    } catch (err) {
      console.error("generateLaporanNarasi failed", err);
    }

    return { analisa, catatan };
  });
