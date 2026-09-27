/**
 * POST /api/admin/login — login admin (password dari env ADMIN_PASSWORD).
 * Rate limit ketat: 5 percobaan / 15 menit / IP.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, rateLimit } from '../../server/db';
import { attachSession, makeSessionToken, passwordMatches } from '../../server/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'method_not_allowed' });
    return;
  }
  if (!rateLimit(req, 5, 15 * 60_000)) {
    json(res, 429, { error: 'rate_limited' });
    return;
  }

  const body = (req.body ?? {}) as { password?: string };
  if (!body.password || !passwordMatches(body.password)) {
    json(res, 401, { error: 'wrong_password' });
    return;
  }

  attachSession(res, makeSessionToken());
  json(res, 200, { ok: true });
}
