/// <reference lib="webworker" />
import type { WorkerRequest, WorkerResponse } from './worker-protocol';

/**
 * Worker pemrosesan gambar PicLite.
 * Decode (createImageBitmap) + Canvas (OffscreenCanvas) + encode berjalan di
 * thread terpisah agar UI tetap mulus saat pengguna menggeser slider pada
 * file besar — main thread tidak pernah memblok.
 */
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  try {
    const bitmap = await createImageBitmap(req.file);
    const canvas = new OffscreenCanvas(req.width, req.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('CANVAS_NOT_SUPPORTED');

    // JPEG tidak mendukung transparansi — latar putih agar tidak menghitam.
    if (req.format === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, req.width, req.height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, req.width, req.height);
    bitmap.close();

    const blob = await canvas.convertToBlob({
      type: `image/${req.format}`,
      quality: req.quality,
    });
    const res: WorkerResponse = { id: req.id, ok: true, blob, width: req.width, height: req.height };
    self.postMessage(res);
  } catch (err) {
    const res: WorkerResponse = {
      id: req.id,
      ok: false,
      error: (err as Error)?.message ?? 'WORKER_FAILED',
    };
    self.postMessage(res);
  }
};
