// CSV/PDF export helpers
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/logo-gegana.jpg.asset.json";

export type LaporanAttachment = { path: string; name?: string };

export type LaporanNarasi = { analisa?: string; catatan?: string };

async function loadImageDataUrl(url: string): Promise<{ data: string; w: number; h: number; fmt: "JPEG" } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    // Downscale to max 900px on the long edge to keep PDF small & fast
    const MAX = 900;
    const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const data = canvas.toDataURL("image/jpeg", 0.7);
    return { data, w, h, fmt: "JPEG" };
  } catch { return null; }
}



function escapeCsv(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const csv = [headers.join(","), ...rows.map(r => r.map(escapeCsv).join(","))].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function downloadPDF(title: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica"); doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, 14, 22);

  const cols = headers.length;
  const pageW = doc.internal.pageSize.getWidth() - 28;
  const colW = pageW / cols;
  let y = 30;

  doc.setFillColor(230, 230, 230);
  doc.rect(14, y - 5, pageW, 7, "F");
  doc.setFont("helvetica", "bold");
  headers.forEach((h, i) => doc.text(String(h).slice(0, 30), 16 + i * colW, y));
  y += 5;
  doc.setFont("helvetica", "normal");

  rows.forEach(r => {
    if (y > doc.internal.pageSize.getHeight() - 12) { doc.addPage(); y = 20; }
    r.forEach((c, i) => {
      const txt = (c ?? "").toString().slice(0, Math.max(8, Math.floor(colW / 2)));
      doc.text(txt, 16 + i * colW, y);
    });
    y += 6;
  });

  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

export async function downloadSinglePDF(
  filename: string,
  judul: string,
  isi: string,
  meta: Record<string, string>,
  attachments: LaporanAttachment[] = [],
  narasi: LaporanNarasi | Promise<LaporanNarasi> = {},
  urut: number = 1,
) {

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("times");
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  const tanggalCetak = new Date();
  const tanggalStr = tanggalCetak.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const romawi = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][tanggalCetak.getMonth()];
  const nomor = `R/LAK/${String(urut).padStart(3, "0")}/${romawi}/${tanggalCetak.getFullYear()}/INPULDATASUS`;


  // Mulai semua I/O paralel sedini mungkin: logo, signed URLs + gambar lampiran.
  const logoPromise = loadImageDataUrl(logoAsset.url);
  const attachmentsPromise = (async () => {
    if (attachments.length === 0) return [] as { data: string; w: number; h: number; fmt: "JPEG"; name: string }[];
    const paths = attachments.map(a => a.path);
    const { data: signedList } = await supabase.storage.from("laporan-images").createSignedUrls(paths, 3600);
    const loaded = await Promise.all(
      attachments.map(async (a, i) => {
        const url = signedList?.[i]?.signedUrl;
        if (!url) return null;
        const img = await loadImageDataUrl(url);
        return img ? { ...img, name: a.name ?? "" } : null;
      })
    );
    return loaded.filter((x): x is { data: string; w: number; h: number; fmt: "JPEG"; name: string } => !!x);
  })();

  // LOGO
  const logo = await logoPromise;
  if (logo) {
    const logoH = 22;
    const logoW = logoH * (logo.w / logo.h);
    try { doc.addImage(logo.data, "JPEG", (pageW - logoW) / 2, y, logoW, logoH); } catch { /* skip */ }
    y += logoH + 4;
  }

  // KOP SURAT
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("SATUAN BANTUAN TEKNIS", pageW / 2, y, { align: "center" });
  y += 5;
  doc.text("INPULDATASUS", pageW / 2, y, { align: "center" });
  y += 2;
  doc.setLineWidth(0.6);
  doc.line(margin, y + 1, pageW - margin, y + 1);
  doc.setLineWidth(0.2);
  doc.line(margin, y + 2, pageW - margin, y + 2);
  y += 10;

  // JUDUL
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.text("LAPORAN ANALISA KEJADIAN", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(11);
  doc.text(`Nomor : ${nomor}`, pageW / 2, y, { align: "center" });
  y += 10;

  // META
  doc.setFontSize(11);
  const labelX = margin;
  const colonX = margin + 42;
  const valueX = margin + 46;
  const fullMeta: Record<string, string> = { Tanggal: tanggalStr, Perihal: judul, ...meta };
  Object.entries(fullMeta).forEach(([k, v]) => {
    const value = v || "-";
    const valLines = doc.splitTextToSize(value, contentW - 46);
    doc.setFont("times", "normal");
    doc.text(k, labelX, y);
    doc.text(":", colonX, y);
    doc.text(valLines, valueX, y);
    y += Math.max(6, valLines.length * 5.2) + 1;
  });
  y += 6;

  // SECTIONS
  const ensureSpace = (h: number) => {
    if (y + h > pageH - 30) { doc.addPage(); y = margin; }
  };
  const writeSection = (roman: string, title: string, body: string) => {
    ensureSpace(12);
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(`${roman}.`, margin + 2, y);
    doc.text(title, margin + 12, y);
    y += 7;
    doc.setFont("times", "normal");
    const lines = doc.splitTextToSize(body, contentW - 12);
    lines.forEach((line: string) => {
      ensureSpace(6);
      doc.text(line, margin + 12, y);
      y += 5.2;
    });
    y += 6;
  };

  writeSection("I", "FAKTA-FAKTA", isi);
  const resolvedNarasi: LaporanNarasi = narasi instanceof Promise ? await narasi : narasi;
  writeSection("II", "ANALISA", resolvedNarasi.analisa || "Berdasarkan fakta-fakta di atas, dilakukan analisa lebih lanjut terkait situasi dan dampak kejadian.");
  writeSection("III", "CATATAN", resolvedNarasi.catatan || "Perlu tindak lanjut dan pemantauan berkelanjutan terhadap kejadian ini.");

  // TANDA TANGAN
  ensureSpace(40);
  y += 4;
  const ttdX = pageW - margin - 60;
  doc.setFont("times", "normal");
  const lokasi = (meta.Polda && meta.Polda !== "—" ? meta.Polda : "Markas Komando");
  doc.text(`${lokasi}, ${tanggalStr}`, ttdX, y);
  y += 20;
  doc.setFont("times", "bold");
  doc.text("Inpuldatasus", ttdX, y);

  // DOKUMENTASI (gambar pendukung) — sudah dimuat paralel sejak awal
  const imgs = await attachmentsPromise;
  if (imgs.length > 0) {
    doc.addPage();
    y = margin;
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("DOKUMENTASI", pageW / 2, y, { align: "center" });
    y += 10;

    const colGap = 6;
    const cellW = (contentW - colGap) / 2;
    const cellH = 70;
    let col = 0;
    for (let i = 0; i < imgs.length; i++) {
      if (y + cellH + 8 > pageH - margin) { doc.addPage(); y = margin; col = 0; }
      const x = margin + col * (cellW + colGap);
      const img = imgs[i];
      const ratio = img.w / img.h;
      let dw = cellW, dh = cellW / ratio;
      if (dh > cellH) { dh = cellH; dw = cellH * ratio; }
      const offX = x + (cellW - dw) / 2;
      const offY = y + (cellH - dh) / 2;
      try { doc.addImage(img.data, img.fmt, offX, offY, dw, dh); } catch { /* skip */ }
      doc.setFont("times", "italic");
      doc.setFontSize(9);
      const cap = `Gambar ${i + 1}${img.name ? ` — ${img.name}` : ""}`;
      doc.text(doc.splitTextToSize(cap, cellW), x, y + cellH + 4);
      col++;
      if (col >= 2) { col = 0; y += cellH + 12; }
    }
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

