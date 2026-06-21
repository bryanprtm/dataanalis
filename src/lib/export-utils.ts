// CSV/PDF export helpers
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export type LaporanAttachment = { path: string; name?: string };

async function loadImageDataUrl(url: string): Promise<{ data: string; w: number; h: number; fmt: "JPEG" | "PNG" } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const fmt: "JPEG" | "PNG" = blob.type.includes("png") ? "PNG" : "JPEG";
    const data: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims: { w: number; h: number } = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 800, h: 600 });
      img.src = data;
    });
    return { data, w: dims.w, h: dims.h, fmt };
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

export function downloadSinglePDF(
  filename: string,
  judul: string,
  isi: string,
  meta: Record<string, string>
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
  const nomor = `R/LAK/${String(tanggalCetak.getMonth() + 1).padStart(2, "0")}/${["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][tanggalCetak.getMonth()]}/${tanggalCetak.getFullYear()}/INPULDATASUS`;

  // KOP SURAT
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("SATUAN BANTUAN TEKNIS", margin, y);
  y += 5;
  doc.text("INPULDATASUS", margin, y);
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
  writeSection("II", "ANALISA", "Berdasarkan fakta-fakta di atas, dilakukan analisa lebih lanjut terkait situasi dan dampak kejadian.");
  writeSection("III", "CATATAN", "Perlu tindak lanjut dan pemantauan berkelanjutan terhadap kejadian ini.");

  // TANDA TANGAN
  ensureSpace(40);
  y += 4;
  const ttdX = pageW - margin - 60;
  doc.setFont("times", "normal");
  doc.text(`Jakarta, ${tanggalStr}`, ttdX, y);
  y += 20;
  doc.setFont("times", "bold");
  doc.text("Inpuldatasus", ttdX, y);

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
