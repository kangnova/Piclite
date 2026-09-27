/** Protokol komunikasi main-thread ↔ image worker (dibagikan dua sisi). */
export interface WorkerRequest {
  id: number;
  /** File asli dari pengguna (di-clone, bukan transfer) */
  file: Blob;
  format: 'jpeg' | 'png' | 'webp';
  /** 0.1–1.0 (diabaikan untuk PNG) */
  quality: number;
  width: number;
  height: number;
}

export interface WorkerResponse {
  id: number;
  ok: boolean;
  blob?: Blob;
  width?: number;
  height?: number;
  error?: string;
}
