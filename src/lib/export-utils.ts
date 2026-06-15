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
