import type { NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Koneksi Neon per-instans (serverless: satu koneksi per invocation).
 * Import driver dibuat LAZY via dynamic import: beberapa runtime bundling
 * (Vercel NFT) dapat gagal pada static import di tahap evaluasi modul —
 * dengan dynamic import, kegagalan tertangkap dan fungsi tetap hidup.
 */
type SqlClient = NeonQueryFunction<false, false>;

let sqlPromise: Promise<SqlClient> | null = null;

async function getSqlClient(): Promise<SqlClient> {
  if (!sqlPromise) {
    sqlPromise = import('@neondatabase/serverless').then(({ neon }) => {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error('DATABASE_URL tidak diset');
      return neon(url) as SqlClient;
    });
  }
  return sqlPromise;
}

/** Pemanggil harus `await getSql()` lalu pakai hasilnya sebagai tag template. */
export async function getSql(): Promise<SqlClient> {
  return getSqlClient();
}

export interface AdminRequest {
  method?: string;
  headers: Record<string, unknown>;
  body?: unknown;
}

export interface AdminResponse {
  setHeader(name: string, value: string): void;
  status(code: number): { json(data: unknown): void; end(): void };
}

export function json(res: AdminResponse, code: number, data: unknown): void {
  res.status(code).json(data);
}

/** Baca cookie dari header request. */
export function getCookie(req: AdminRequest, name: string): string | null {
  const header = req.headers.cookie;
  if (typeof header !== 'string') return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return null;
}

/** Rate limit sederhana per-IP (in-memory, best effort di serverless). */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(req: AdminRequest, max: number, windowMs: number): boolean {
  const fwd = req.headers['x-forwarded-for'];
  const ip = (typeof fwd === 'string' ? fwd.split(',')[0].trim() : 'unknown') || 'unknown';
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) buckets.clear();
    return true;
  }
  bucket.count += 1;
  return bucket.count <= max;
}
