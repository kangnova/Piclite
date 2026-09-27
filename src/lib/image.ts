/**
 * Engine pemrosesan gambar PicLite — 100% client-side.
 * Primer: Web Worker (OffscreenCanvas) supaya main thread bebas → UI tidak
 * pernah freeze walau memproses gambar besar. Fallback: Canvas main thread
 * untuk browser lama tanpa OffscreenCanvas/module worker.
 * PRD: tidak ada backend, semua proses di perangkat pengguna.
 */

export type OutputFormat = 'jpeg' | 'png' | 'webp';
import type { WorkerRequest, WorkerResponse } from './worker-protocol';
export type SourceFormat = 'jpeg' | 'png' | 'webp' | 'heic' | 'avif' | 'unknown';

export interface SourceImage {
  /** File asli yang dipilih pengguna */
  file: File;
  /** Data URL untuk preview (jangan disimpan ke storage) */
  url: string;
  /** Bitmap ter-dekode untuk diproses di Canvas */
  bitmap: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  format: SourceFormat;
}

export interface ProcessResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  format: OutputFormat;
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB sesuai PRD

export function detectFormat(file: File): SourceFormat {
  const name = file.name.toLowerCase();
  if (file.type === 'image/webp' || name.endsWith('.webp')) return 'webp';
  if (file.type === 'image/png' || name.endsWith('.png')) return 'png';
  if (file.type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'jpeg';
  if (file.type === 'image/heic' || file.type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif')) return 'heic';
  if (file.type === 'image/avif' || name.endsWith('.avif')) return 'avif';
  return 'unknown';
}

/**
 * Muat file gambar apa pun yang didukung browser menjadi bitmap.
 * HEIC/AVIF dicoba lewat createImageBitmap (didukung Safari/iOS untuk HEIC).
 */
export async function loadImage(file: File): Promise<SourceImage> {
  const format = detectFormat(file);
  let bitmap: ImageBitmap | HTMLImageElement;

  if (typeof createImageBitmap === 'function') {
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      bitmap = await loadViaImageElement(file);
    }
  } else {
    bitmap = await loadViaImageElement(file);
  }

  return {
    file,
    url: URL.createObjectURL(file),
    bitmap,
    width: bitmap.width,
    height: bitmap.height,
    format,
  };
}

function loadViaImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('FORMAT_NOT_SUPPORTED'));
    };
    img.src = url;
  });
}

export interface ProcessOptions {
  format: OutputFormat;
  /** 10–100, dipetakan ke quality 0.1–1.0 (diabaikan untuk PNG) */
  quality: number;
  /** undefined = pertahankan ukuran asli */
  width?: number;
  height?: number;
}

/* ------------------------- Jalur Web Worker ------------------------- */

interface PendingJob {
  resolve: (result: ProcessResult) => void;
  reject: (error: Error) => void;
  format: OutputFormat;
}

let worker: Worker | null = null;
let workerAvailable = typeof Worker !== 'undefined';
let nextJobId = 1;
const jobs = new Map<number, PendingJob>();

function getWorker(): Worker | null {
  if (!workerAvailable) return null;
  if (worker) return worker;
  try {
    const w = new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const res = event.data;
      const job = jobs.get(res.id);
      if (!job) return;
      jobs.delete(res.id);
      if (res.ok && res.blob && res.width && res.height) {
        job.resolve({
          blob: res.blob,
          url: URL.createObjectURL(res.blob),
          width: res.width,
          height: res.height,
          format: job.format,
        });
      } else {
        job.reject(new Error(res.error ?? 'WORKER_FAILED'));
      }
    };
    // Worker gagal dimuat (browser lama) → tandai tidak tersedia; job yang
    // menggantung ditolak agar pemanggil jatuh ke jalur main thread.
    w.onerror = () => {
      workerAvailable = false;
      for (const [id, job] of jobs) {
        job.reject(new Error('WORKER_UNAVAILABLE'));
        jobs.delete(id);
      }
      w.terminate();
      if (worker === w) worker = null;
    };
    worker = w;
    return w;
  } catch {
    workerAvailable = false;
    return null;
  }
}

function runInWorker(w: Worker, req: WorkerRequest, format: OutputFormat): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    jobs.set(req.id, { resolve, reject, format });
    w.postMessage(req);
  });
}

/* --------------------------- API publik ---------------------------- */

/**
 * Kompres + resize + convert dalam satu pass Canvas.
 * Berjalan di Web Worker bila tersedia (UI tetap responsif); jika gagal,
 * otomatis fallback ke Canvas main thread. Tidak ada permintaan jaringan.
 */
export async function processImage(source: SourceImage, opts: ProcessOptions): Promise<ProcessResult> {
  const quality = Math.min(100, Math.max(10, opts.quality)) / 100;
  const width = Math.max(1, Math.round(opts.width ?? source.width));
  const height = Math.max(1, Math.round(opts.height ?? source.height));

  const w = getWorker();
  if (w) {
    const req: WorkerRequest = {
      id: nextJobId++,
      file: source.file,
      format: opts.format,
      quality,
      width,
      height,
    };
    try {
      return await runInWorker(w, req, opts.format);
    } catch {
      // Worker gagal (browser lama, OffscreenCanvas tidak ada, decode HEIC,
      // dll.) → proses ulang di main thread sebagai jalur aman.
    }
  }
  return processOnMainThread(source.bitmap, opts.format, quality, width, height);
}

/** Jalur fallback tanpa worker (perilaku lama, tetap benar). */
function processOnMainThread(
  bitmap: ImageBitmap | HTMLImageElement,
  format: OutputFormat,
  quality: number,
  width: number,
  height: number,
): Promise<ProcessResult> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('CANVAS_NOT_SUPPORTED'));

  // JPEG tidak mendukung transparansi — latar putih agar tidak menghitam.
  if (format === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('ENCODE_FAILED'));
          return;
        }
        resolve({
          blob,
          url: URL.createObjectURL(blob),
          width,
          height,
          format,
        });
      },
      `image/${format}`,
      quality,
    );
  });
}

/** Format ukuran file: KB untuk < 1 MB, MB selebihnya. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Persentase penghematan, dibulatkan; negatif berarti hasil lebih besar. */
export function savingsPercent(original: number, result: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - result) / original) * 100);
}
