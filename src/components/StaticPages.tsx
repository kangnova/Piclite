/**
 * Halaman statis untuk syarat Google AdSense: Kebijakan Privasi & Kontak.
 * Bilingual mengikuti bahasa UI (localStorage). Routing di App.tsx:
 * /privacy, /kontak|/contact, dan /#admin.
 */
import { Mail, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n';

const privacy = {
  id: {
    title: 'Kebijakan Privasi',
    updated: 'Terakhir diperbarui: 27 September 2026',
    intro:
      'PicLite adalah tool web untuk mengompres, mengubah ukuran, dan mengonversi gambar serta PDF. Privasi Anda adalah fondasi produk ini — kebijakan ini menjelaskan dengan jelas data apa yang (dan tidak) diproses.',
    s1Title: '1. File Anda diproses 100% di perangkat Anda',
    s1Body:
      'Seluruh pemrosesan gambar dan PDF berjalan lokal di browser Anda menggunakan teknologi Canvas dan WebAssembly. File Anda TIDAK PERNAH diunggah, dikirim, atau disimpan di server kami. Setelah Anda menutup halaman, tidak ada sisa file yang tertinggal di mana pun.',
    s2Title: '2. Statistik pemakaian anonim',
    s2Body:
      'Untuk keperluan pengembangan, kami mencatat hitungan agregat anonim: jumlah kunjungan halaman, jumlah gambar/PDF yang diproses, dan jumlah unduhan. Hitungan ini tidak mengandung IP, nama file, isi dokumen, identitas, maupun fingerprint perangkat — hanya angka per hari.',
    s3Title: '3. Cookie dan penyimpanan lokal',
    s3Body:
      'PicLite tidak memakai cookie pelacakan. Penyimpanan lokal di perangkat Anda hanya dipakai untuk mengingat pilihan bahasa (ID/EN).',
    s4Title: '4. Layanan analitik pihak ketiga',
    s4Body:
      'Kami dapat menggunakan Cloudflare Web Analytics dan Google Analytics 4 untuk statistik kunjungan agregat. Keduanya menganonimkan/memotong IP dan tidak digunakan untuk mengidentifikasi individu. Data file Anda tetap tidak pernah dikirim ke pihak mana pun.',
    s5Title: '5. Iklan pihak ketiga (Google AdSense)',
    s5Body:
      'Situs ini dapat menampilkan iklan dari Google AdSense. Google, sebagai penyedia pihak ketiga, menggunakan cookie untuk menayangkan iklan berdasarkan kunjungan Anda ke situs ini dan/atau situs lain. Anda dapat menonaktifkan iklan personalisasi melalui Pengaturan Iklan Google (google.com/settings/ads).',
    s6Title: '6. Perubahan kebijakan',
    s6Body:
      'Kebijakan ini dapat diperbarui sewaktu-waktu. Tanggal pembaruan di atas akan disesuaikan setiap ada perubahan material.',
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: September 27, 2026',
    intro:
      'PicLite is a web tool for compressing, resizing, and converting images and PDFs. Your privacy is the foundation of this product — this policy explains exactly what data is (and is not) processed.',
    s1Title: '1. Your files are processed 100% on your device',
    s1Body:
      'All image and PDF processing runs locally in your browser using Canvas and WebAssembly technologies. Your files are NEVER uploaded, transmitted, or stored on our servers. Once you close the page, no trace of your files remains anywhere.',
    s2Title: '2. Anonymous usage statistics',
    s2Body:
      'For development purposes, we record anonymous aggregate counters: page visits, number of images/PDFs processed, and downloads. These counters contain no IP addresses, file names, document contents, identities, or device fingerprints — just daily numbers.',
    s3Title: '3. Cookies and local storage',
    s3Body:
      'PicLite uses no tracking cookies. Local storage on your device is only used to remember your language choice (EN/ID).',
    s4Title: '4. Third-party analytics',
    s4Body:
      'We may use Cloudflare Web Analytics and Google Analytics 4 for aggregate visit statistics. Both anonymize/truncate IP addresses and are not used to identify individuals. Your files are still never sent anywhere.',
    s5Title: '5. Third-party advertising (Google AdSense)',
    s5Body:
      'This site may display ads from Google AdSense. Google, as a third-party vendor, uses cookies to serve ads based on your visits to this and/or other sites. You may opt out of personalized advertising via Google Ads Settings (google.com/settings/ads).',
    s6Title: '6. Changes to this policy',
    s6Body:
      'This policy may be updated from time to time. The date above will be adjusted whenever a material change is made.',
  },
} as const;

const contact = {
  id: {
    title: 'Kontak',
    intro: 'Ada pertanyaan, saran fitur, atau menemukan masalah? Kami senang mendengar dari Anda.',
    emailLabel: 'Email',
    emailNote: 'Balasan biasanya dalam 1–3 hari kerja.',
    back: '← Kembali ke aplikasi',
  },
  en: {
    title: 'Contact',
    intro: 'Questions, feature suggestions, or found a bug? We would love to hear from you.',
    emailLabel: 'Email',
    emailNote: 'Replies usually within 1–3 business days.',
    back: '← Back to the app',
  },
} as const;

/** TODO: ganti dengan email Anda sendiri sebelum deploy produksi. */
const CONTACT_EMAIL = 'hello@piclite.app';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <img src="/favicon.svg" alt="Logo PicLite" className="h-7 w-7" />
          <a href="/" className="text-lg font-extrabold tracking-tight">PicLite</a>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 text-center text-xs text-slate-400">
          PicLite © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

export function PrivacyPage() {
  const { lang } = useI18n();
  const c = privacy[lang];
  return (
    <Shell>
      <article className="space-y-5 text-sm leading-relaxed text-slate-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          <h1 className="text-2xl font-extrabold text-slate-900">{c.title}</h1>
        </div>
        <p className="text-xs text-slate-400">{c.updated}</p>
        <p>{c.intro}</p>
        {[
          [c.s1Title, c.s1Body],
          [c.s2Title, c.s2Body],
          [c.s3Title, c.s3Body],
          [c.s4Title, c.s4Body],
          [c.s5Title, c.s5Body],
          [c.s6Title, c.s6Body],
        ].map(([title, body]) => (
          <section key={title}>
            <h2 className="font-bold text-slate-900">{title}</h2>
            <p className="mt-1">{body}</p>
          </section>
        ))}
      </article>
    </Shell>
  );
}

export function ContactPage() {
  const { lang } = useI18n();
  const c = contact[lang];
  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-extrabold text-slate-900">{c.title}</h1>
        </div>
        <p className="text-sm text-slate-600">{c.intro}</p>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-400">{c.emailLabel}</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-lg font-bold text-indigo-600 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          <p className="mt-1 text-xs text-slate-400">{c.emailNote}</p>
        </div>
        <a href="/" className="inline-block text-sm text-slate-500 hover:text-slate-800">{c.back}</a>
      </div>
    </Shell>
  );
}
