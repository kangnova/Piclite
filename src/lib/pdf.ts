/**
 * Engine kompres PDF PicLite — 100% client-side (metode rasterize).
 *
 * Alur: pdf.js merender tiap halaman ke canvas (2× resolusi) → canvas di-encode
 * jadi JPEG berkualitas sesuai slider → pdf-lib menyusun ulang semua JPEG
 * menjadi PDF baru berukuran halaman sama persis.
 *
 * Konsekuensi metode rasterize: teks berubah menjadi gambar (tidak bisa
 * diselect/dicari), tapi penghematan ukuran besar untuk PDF hasil scan/foto.
 * Tidak ada byte yang pernah dikirim ke server — semua proses di perangkat.
 *
 * pdf.js & pdf-lib diimpor secara lazy (dynamic import) supaya ±1 MB dependensi
 * ini hanya diunduh saat pengguna benar-benar mengunggah PDF.
 */
import type * as PdfjsLib from 'pdfjs-dist';

/** Aset opsional pdf.js (cmap, font standar, wasm) di-copy dari node_modules ke public/. */
const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

/** Skala render: 2× untuk teks kecil tetap terbaca setelah dikompres. */
const RENDER_SCALE = 2;
/** Konversi px canvas (96 dpi) ke pt halaman PDF (72 dpi). */
const PT_PER_PX = 72 / 96;

let pdfjsPromise: Promise<typeof PdfjsLib> | null = null;

/** Muat pdf.js sekali, lalu pasang worker lokal (dibundel Vite, tanpa CDN). */
function getPdfjs(): Promise<typeof PdfjsLib> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const lib = await import('pdfjs-dist');
      const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      lib.GlobalWorkerOptions.workerPort = new Worker(workerUrl, { type: 'module' });
      return lib;
    })();
  }
  return pdfjsPromise;
}

export interface PdfProcessOptions {
  /** 10–100, dipetakan ke kualitas JPEG 0.1–1.0 */
  quality: number;
}

export interface PdfProcessResult {
  blob: Blob;
  url: string;
  pageCount: number;
}

/** Hitung halaman PDF cepat via pdf-lib untuk kartu info (null jika gagal dibaca). */
export async function countPdfPages(file: File): Promise<number | null> {
  try {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return null;
  }
}

/**
 * Kompres PDF dengan merender ulang tiap halaman menjadi JPEG.
 * `onPage` dipanggil tiap halaman selesai untuk indikator progres.
 */
export async function compressPdf(
  file: File,
  opts: PdfProcessOptions,
  onPage?: (current: number, total: number) => void,
): Promise<PdfProcessResult> {
  const quality = Math.min(100, Math.max(10, opts.quality)) / 100;
  const { getDocument } = await getPdfjs();
  const { PDFDocument } = await import('pdf-lib');

  const data = new Uint8Array(await file.arrayBuffer());

  const loadingTask = getDocument({
    data,
    cMapUrl: `${BASE}pdfjs/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${BASE}pdfjs/standard_fonts/`,
    iccUrl: `${BASE}pdfjs/iccs/`,
    wasmUrl: `${BASE}pdfjs/wasm/`,
  });

  try {
    const pdf = await loadingTask.promise;
    const total = pdf.numPages;
    const out = await PDFDocument.create();

    for (let i = 1; i <= total; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const width = Math.floor(viewport.width);
      const height = Math.floor(viewport.height);

      // Latar putih dulu: JPEG tanpa alpha — dokumen tidak jadi transparan/hitam.
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('CANVAS_NOT_SUPPORTED');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      await page.render({ canvas, viewport }).promise;

      const jpegBlob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('ENCODE_FAILED'))),
          'image/jpeg',
          quality,
        ),
      );

      const img = await out.embedJpg(await jpegBlob.arrayBuffer());
      page.cleanup();

      // Halaman baru berukuran pt sama persis dengan halaman asli.
      const pageWidthPt = (width / RENDER_SCALE) * PT_PER_PX;
      const pageHeightPt = (height / RENDER_SCALE) * PT_PER_PX;
      const pdfPage = out.addPage([pageWidthPt, pageHeightPt]);
      pdfPage.drawImage(img, {
        x: 0,
        y: 0,
        width: pageWidthPt,
        height: pageHeightPt,
      });

      canvas.width = 0;
      canvas.height = 0;
      onPage?.(i, total);
    }

    const bytes = await out.save({ useObjectStreams: true });
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    return { blob, url: URL.createObjectURL(blob), pageCount: total };
  } finally {
    await loadingTask.destroy();
  }
}
