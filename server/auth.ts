import { createHmac, timingSafeEqual } from 'node:crypto';
import { getCookie, type AdminRequest, type AdminResponse } from './db';

/**
 * Sesi admin berbasis cookie HttpOnly bertanda tangan HMAC.
 * Sederhana, tanpa tabel sesi — cukup untuk satu admin (pemilik tool).
 */
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

/** Bandingkan password secara timing-safe (normalisasi via SHA-256). */
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

/** Middleware ringan: tolak bila sesi tidak valid. */
export function requireAdmin(req: AdminRequest): boolean {
  return verifySessionToken(getCookie(req, COOKIE_NAME));
}
