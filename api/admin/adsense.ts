/**
 * GET  /api/admin/adsense — baca konfigurasi AdSense (wajib login).
 * POST /api/admin/adsense — simpan konfigurasi; slot ID divalidasi ketat.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, json } from '../_lib/db';
import { requireAdmin } from '../_lib/auth';

const CLIENT_RE = /^ca-pub-\d{10,20}$/;
const SLOT_RE = /^\d{8,12}$/;
const STR_RE = /^[A-Za-z0-9_\-]{0,64}$/;

interface AdsenseConfig {
  enabled: boolean;
  testMode: boolean;
  client: string;
  slotHero: string;
  slotInline: string;
}

function sanitize(input: Partial<AdsenseConfig>): Partial<AdsenseConfig> | null {
  const client = String(input.client ?? '');
  const slotHero = String(input.slotHero ?? '');
  const slotInline = String(input.slotInline ?? '');
  if (client !== '' && !CLIENT_RE.test(client)) return null;
  if (slotHero !== '' && !SLOT_RE.test(slotHero)) return null;
  if (slotInline !== '' && !SLOT_RE.test(slotInline)) return null;
  if (!STR_RE.test(slotHero) || !STR_RE.test(slotInline)) return null;
  return {
    enabled: Boolean(input.enabled),
    testMode: Boolean(input.testMode),
    client,
    slotHero,
    slotInline,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req)) {
    json(res, 401, { error: 'unauthorized' });
    return;
  }

  const db = getSql();

  try {
    if (req.method === 'GET') {
      const rows = (await db`SELECT value FROM app_config WHERE key = 'adsense' LIMIT 1`) as {
        value?: Partial<AdsenseConfig>;
      }[];
      json(res, 200, rows[0]?.value ?? {});
      return;
    }

    if (req.method === 'POST') {
      const clean = sanitize((req.body ?? {}) as Partial<AdsenseConfig>);
      if (!clean) {
        json(res, 400, { error: 'invalid_format' });
        return;
      }
      await db`
        INSERT INTO app_config (key, value, updated_at)
        VALUES ('adsense', ${JSON.stringify(clean)}::jsonb, now())
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_at = now()
      `;
      json(res, 200, { ok: true });
      return;
    }

    json(res, 405, { error: 'method_not_allowed' });
  } catch (err) {
    console.error('adsense admin failed', err);
    json(res, 500, { error: 'db_failed' });
  }
}
