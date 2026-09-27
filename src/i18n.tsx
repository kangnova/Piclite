import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Sistem bilingual ringan (ID default + EN) tanpa dependensi eksternal.
 * Bahasa disimpan di localStorage; default Indonesia sesuai target pasar PRD.
 */

export type Lang = 'id' | 'en';

const dict = {
  // Hero
  tagline: { id: 'Kompres Gambar & PDF — Instan di Browser', en: 'Compress Images & PDF — Instantly in Your Browser' },
  heroSub: {
    id: 'Tanpa upload ke server. Tanpa registrasi. Gratis.',
    en: 'No server upload. No sign-up. Free.',
  },
  // Upload
  dropHere: { id: 'Tarik & lepas gambar di sini', en: 'Drag & drop your image here' },
  orClick: { id: 'atau klik untuk memilih file', en: 'or click to choose a file' },
  supports: {
    id: 'Mendukung JPG, PNG, WebP, HEIC, AVIF, PDF · Maks 10 MB',
    en: 'Supports JPG, PNG, WebP, HEIC, AVIF, PDF · Max 10 MB',
  },
  trySample: { id: 'Coba dengan gambar contoh', en: 'Try with a sample image' },
  // Panel
  compress: { id: 'Kompres', en: 'Compress' },
  resize: { id: 'Resize', en: 'Resize' },
  convert: { id: 'Convert', en: 'Convert' },
  quality: { id: 'Kualitas', en: 'Quality' },
  width: { id: 'Lebar', en: 'Width' },
  height: { id: 'Tinggi', en: 'Height' },
  keepRatio: { id: 'Pertahankan rasio aspek', en: 'Keep aspect ratio' },
  outputFormat: { id: 'Format keluaran', en: 'Output format' },
  // Preview & aksi
  before: { id: 'Asli', en: 'Original' },
  after: { id: 'Hasil', en: 'Result' },
  resolution: { id: 'Resolusi', en: 'Resolution' },
  fileSize: { id: 'Ukuran file', en: 'File size' },
  smaller: { id: 'lebih kecil', en: 'smaller' },
  larger: { id: 'lebih besar', en: 'larger' },
  sameSize: { id: 'ukuran sama', en: 'same size' },
  download: { id: 'Download', en: 'Download' },
  reset: { id: 'Upload Baru', en: 'New File' },
  fileName: { id: 'Nama file', en: 'File name' },
  pdfMode: { id: 'Mode PDF', en: 'PDF Mode' },
  pages: { id: 'Halaman', en: 'Pages' },
  pdfNote: {
    id: 'PDF hasil scan/foto terkompres kuat. Teks menjadi gambar (tidak bisa diseleksi). PDF berbasis teks mungkin tidak mengecil.',
    en: 'Scanned/photo PDFs compress strongly. Text becomes an image (no longer selectable). Text-based PDFs may not shrink.',
  },
  processingPage: { id: 'Memproses halaman', en: 'Processing page' },
  of: { id: 'dari', en: 'of' },
  errPdf: {
    id: 'Gagal membaca PDF. File mungkin rusak atau dilindungi password.',
    en: 'Failed to read the PDF. The file may be corrupted or password-protected.',
  },
  // Privasi
  privacyNote: {
    id: '100% Aman. Gambar & PDF Anda diproses secara lokal di perangkat Anda dan tidak pernah dikirim ke server kami.',
    en: '100% Safe. Your images & PDFs are processed locally on your device and are never sent to our servers.',
  },
  // Error
  errTooLarge: { id: 'Ukuran file melebihi 10 MB. Silakan pilih file yang lebih kecil.', en: 'File exceeds 10 MB. Please choose a smaller file.' },
  errNotImage: {
    id: 'File yang dipilih bukan gambar atau PDF yang didukung (JPG, PNG, WebP, HEIC, AVIF, PDF).',
    en: 'The selected file is not a supported image or PDF (JPG, PNG, WebP, HEIC, AVIF, PDF).',
  },
  errLoad: { id: 'Gagal membaca gambar. Format mungkin tidak didukung browser Anda.', en: 'Failed to read the image. The format may not be supported by your browser.' },
  // Footer
  footerMade: { id: 'Dibuat untuk mempercepat pekerjaan Anda.', en: 'Built to speed up your workflow.' },
  langLabel: { id: 'Bahasa', en: 'Language' },
  // Tautan halaman
  privacyPolicy: { id: 'Kebijakan Privasi', en: 'Privacy Policy' },
  contactUs: { id: 'Kontak', en: 'Contact' },
  adminPanel: { id: 'Admin', en: 'Admin' },
  // SEO
  seoPdfTitle: { id: 'Kompres PDF Online Gratis di Browser', en: 'Compress PDF Online Free in Your Browser' },
  seoPdfBody1: {
    id: 'PicLite bukan hanya kompresor gambar. Unggah PDF hasil scan atau foto — KTP, ijazah, dokumen lamaran kerja, laporan — dan perkecil ukurannya tanpa watermark, tanpa batas jumlah, tanpa daftar akun. Semua proses berjalan lokal di browser Anda; file tidak pernah dikirim ke server mana pun.',
    en: 'PicLite is more than an image compressor. Upload scanned or photographed PDFs — ID cards, diplomas, job application documents, reports — and shrink them with no watermark, no file limit, no sign-up. Everything runs locally in your browser; files are never sent to any server.',
  },
  seoPdfBody2: {
    id: 'Butuh format lain? PicLite juga kompres JPG dan PNG, resize pas foto untuk pendaftaran online, dan convert ke WebP agar website makin cepat — semuanya gratis dalam satu alat.',
    en: 'Need other formats? PicLite also compresses JPG and PNG, resizes photos for online registrations, and converts to WebP for faster websites — all free in one tool.',
  },
} as const;

export type DictKey = keyof typeof dict;

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'piclite-lang';

function getInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'id' || saved === 'en') return saved;
  } catch {
    /* localStorage tidak tersedia — abaikan */
  }
  return 'id';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* abaikan */
    }
  };

  const t = (key: DictKey) => dict[key][lang];

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n harus dipakai di dalam I18nProvider');
  return ctx;
}
