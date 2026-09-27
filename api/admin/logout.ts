/** POST /api/admin/logout — hapus cookie sesi admin. */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json } from '../_shared.js';
import { clearSession } from '../_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'method_not_allowed' });
    return;
  }
  clearSession(res);
  json(res, 200, { ok: true });
}
