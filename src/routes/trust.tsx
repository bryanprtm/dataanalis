import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Lock, Database, Users, FileText, Mail } from "lucide-react";

export const Route = createFileRoute("/trust")({
  component: TrustPage,
  head: () => ({
    meta: [
      { title: "Trust & Keamanan — Sat Bantek INPULDATASUS" },
      { name: "description", content: "Halaman keamanan, privasi, dan kontrol akses aplikasi internal Sat Bantek INPULDATASUS." },
    ],
  }),
});

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section className="panel scanline p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h2 className="font-mono-display text-sm tracking-widest text-primary">[ {title} ]</h2>
      </div>
      <div className="text-sm text-foreground/85 space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}

function TrustPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link to="/" className="font-mono-display text-xs tracking-widest text-primary">[ INPULDATASUS ]</Link>
          <Link to="/auth" className="text-xs font-mono-display px-3 py-1.5 border border-border rounded hover:border-primary">MASUK →</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div>
          <div className="font-mono-display text-[10px] tracking-widest text-muted-foreground mb-2">DOC · 00 · TRUST_CENTER</div>
          <h1 className="text-3xl font-bold mb-3">Trust &amp; Keamanan</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Halaman ini dipelihara oleh tim Sat Bantek INPULDATASUS untuk menjelaskan kontrol keamanan,
            privasi, dan akses yang diterapkan pada aplikasi internal ini. Konten halaman dapat disunting
            oleh pemilik aplikasi dan <span className="text-foreground">bukan merupakan sertifikasi pihak ketiga</span> atau
            verifikasi independen dari platform.
          </p>
        </div>

        <Section icon={Shield} title="MODEL_AKSES">
          <p>
            Aplikasi ini bersifat internal — hanya untuk personel resmi. Tidak ada halaman publik yang
            menyajikan data laporan. Seluruh halaman operasional berada di balik halaman masuk.
          </p>
          <ul className="list-disc list-inside space-y-1 text-foreground/80">
            <li>Login email &amp; password dengan sesi yang dikelola platform.</li>
            <li>Peran pengguna: <span className="font-mono-display">super_admin</span>, <span className="font-mono-display">admin_sat</span>, <span className="font-mono-display">admin_subden</span>, <span className="font-mono-display">operator</span>.</li>
            <li>Pengecekan peran dilakukan di sisi server (database policy), bukan hanya di antarmuka.</li>
          </ul>
        </Section>

        <Section icon={Lock} title="PROTEKSI_DATA">
          <p>
            Setiap tabel data menerapkan kebijakan akses baris (Row-Level Security). Pengguna hanya dapat
            melihat dan mengubah baris yang menjadi tanggung jawabnya; administrator memiliki cakupan akses
            yang lebih luas sesuai peran.
          </p>
          <ul className="list-disc list-inside space-y-1 text-foreground/80">
            <li>Lampiran laporan dan arsip disimpan dalam bucket privat.</li>
            <li>Akses berkas hanya melalui URL bertanda tangan dengan masa berlaku terbatas.</li>
            <li>Komunikasi antara peramban dan backend dienkripsi melalui HTTPS/TLS.</li>
          </ul>
        </Section>

        <Section icon={Database} title="PENGUMPULAN_DATA">
          <p>
            Data yang disimpan terbatas pada keperluan operasional satuan: profil personel (nama, pangkat,
            NRP, satuan/subden, polda), laporan kejadian, kegiatan, arsip dokumen, dan lampiran yang
            diunggah oleh pengguna terdaftar.
          </p>
          <p className="text-foreground/70">
            Pertanyaan terkait retensi spesifik, prosedur penghapusan, atau permintaan data oleh subjek data
            akan ditangani oleh pemilik aplikasi sesuai kebijakan internal satuan.
          </p>
        </Section>

        <Section icon={Users} title="TANGGUNG_JAWAB_BERSAMA">
          <p>
            Keamanan aplikasi adalah tanggung jawab bersama antara <span className="text-foreground">penyedia platform</span> (penyediaan
            infrastruktur, autentikasi, penyimpanan dengan enkripsi saat transit) dan <span className="text-foreground">pemilik aplikasi</span>
            (pemberian peran, pengelolaan akun pengguna, validasi data, kebijakan operasional).
          </p>
          <p>
            Pengguna akhir bertanggung jawab menjaga kerahasiaan kredensial dan tidak membagikan akses
            kepada pihak yang tidak berwenang.
          </p>
        </Section>

        <Section icon={FileText} title="INTEGRASI_PIHAK_KETIGA">
          <p>
            Aplikasi menggunakan layanan backend terkelola untuk autentikasi, basis data, dan penyimpanan
            berkas, serta gateway AI untuk fitur analisa otomatis pada laporan dan peta operasional. Tidak
            ada penjualan data ke pihak ketiga.
          </p>
        </Section>

        <Section icon={Mail} title="KONTAK_KEAMANAN">
          <p>
            Untuk melaporkan dugaan kerentanan, masalah akses, atau pertanyaan privasi terkait aplikasi
            ini, silakan hubungi administrator Sat Bantek INPULDATASUS melalui kanal komunikasi resmi
            satuan.
          </p>
          <p className="text-foreground/70 text-xs font-mono-display pt-2">
            HALAMAN INI DIPELIHARA OLEH PEMILIK APLIKASI · DIPERBARUI SECARA BERKALA
          </p>
        </Section>
      </main>

      <footer className="border-t border-border/40 mt-10">
        <div className="max-w-4xl mx-auto px-6 py-6 text-[10px] font-mono-display text-muted-foreground flex items-center justify-between">
          <span>© SAT BANTEK · INPULDATASUS</span>
          <Link to="/auth" className="hover:text-primary">MASUK</Link>
        </div>
      </footer>
    </div>
  );
}
