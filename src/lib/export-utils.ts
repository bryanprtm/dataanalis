// CSV/PDF export helpers
import jsPDF from "jspdf";

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
  const doc = new jsPDF({ orientation: "portrait" });
  doc.setFont("helvetica");
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = margin;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("LAPORAN BIG DATA INFORMASI", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, margin, y);
  y += 12;

  doc.setFillColor(230, 230, 230);
  doc.rect(margin, y - 4, contentW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.text("JUDUL LAPORAN", margin + 2, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  const titleLines = doc.splitTextToSize(judul, contentW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 5 + 8;

  doc.setFont("helvetica", "bold");
  doc.text("METADATA", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  Object.entries(meta).forEach(([k, v]) => {
    const label = `${k}:`;
    const value = v || "-";
    const valLines = doc.splitTextToSize(value, contentW - 40);
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(valLines, margin + 40, y);
    y += Math.max(5, valLines.length * 5) + 2;
  });

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("ISI LAPORAN", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  const bodyLines = doc.splitTextToSize(isi, contentW);
  bodyLines.forEach((line: string) => {
    if (y > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 5;
  });

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
