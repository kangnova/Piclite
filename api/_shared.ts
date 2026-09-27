/**
 * Kode bersama untuk semua fungsi api/ — SATU file di dalam folder api/
 * (prefix underscore = tidak dideploy sebagai function, tapi selalu ikut
 * dalam file tracing Vercel saat di-import statis).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NeonQueryFunction } from '@neondatabase/serverless';

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

/* ------------------------- Database (lazy) ------------------------- */

type SqlClient = NeonQueryFunction<false, false>;

let sqlPromise: Promise<SqlClient> | null = null;

/** Import driver Neon dibuat lazy agar evaluasi modul tidak pernah gagal. */
export async function getSql(): Promise<SqlClient> {
  if (!sqlPromise) {
    sqlPromise = import('@neondatabase/serverless').then(({ neon }) => {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error('DATABASE_URL tidak diset');
      return neon(url) as SqlClient;
    });
  }
  return sqlPromise;
}

/* ----------------------------- Cookies ----------------------------- */

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

/* --------------------------- Rate limit ---------------------------- */

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Rate limit sederhana per-IP (in-memory, best effort di serverless). */
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

/* ------------------------- Auth admin ------------------------------ */

const COOKIE_NAME = 'pl_admin';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

function getSecret(): string {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

/** Buat token sesi baru. */
export function makeSessionToken(): string {
  const issued = Date.now().toString(36);
  return `${issued}.${sign(issued)}`;
}

/** Verifikasi token & usia sesi (timing-safe). */
export function verifySessionToken(token: string | null): boolean {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot === -1) return false;
  const issued = token.slice(0, dot);
  const sig = Buffer.from(token.slice(dot + 1), 'hex');
  const expected = Buffer.from(sign(issued), 'hex');
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return false;
  const issuedAt = parseInt(issued, 36);
  return Number.isFinite(issuedAt) && Date.now() - issuedAt < MAX_AGE_MS;
}

/** Bandingkan password secara timing-safe (normalisasi via HMAC). */
export function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (!expected) return false;
  const a = createHmac('sha256', 'piclite-login').update(input).digest();
  const b = createHmac('sha256', 'piclite-login').update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Set cookie sesi pada response. */
export function attachSession(res: AdminResponse, token: string): void {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`,
  );
}

/** Hapus cookie sesi. */
export function clearSession(res: AdminResponse): void {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

/** Tolak bila sesi tidak valid. */
export function requireAdmin(req: AdminRequest): boolean {
  return verifySessionToken(getCookie(req, COOKIE_NAME));
}
