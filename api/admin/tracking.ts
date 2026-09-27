/**
 * GET  /api/admin/tracking — baca status pencatatan (wajib login).
 * POST /api/admin/tracking — { enabled: false } = jeda; hit masuk diabaikan.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, json } from '../_shared';
import { requireAdmin } from '../_shared';

interface TrackingConfig {
  enabled: boolean;
}

const DEFAULT: TrackingConfig = { enabled: true };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req)) {
    json(res, 401, { error: 'unauthorized' });
    return;
  }

  const db = await getSql();
  try {
    if (req.method === 'GET') {
      const rows = (await db`SELECT value FROM app_config WHERE key = 'tracking' LIMIT 1`) as {
        value?: Partial<TrackingConfig>;
      }[];
      json(res, 200, { ...DEFAULT, ...rows[0]?.value });
      return;
    }

    if (req.method === 'POST') {
      const body = (req.body ?? {}) as { enabled?: boolean };
      const value: TrackingConfig = { enabled: Boolean(body.enabled) };
      await db`
        INSERT INTO app_config (key, value, updated_at)
        VALUES ('tracking', ${JSON.stringify(value)}::jsonb, now())
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_at = now()
      `;
      json(res, 200, { ok: true, ...value });
      return;
    }

    json(res, 405, { error: 'method_not_allowed' });
  } catch (err) {
    console.error('tracking admin failed', err);
    json(res, 500, { error: 'db_failed' });
  }
}
