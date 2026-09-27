/**
 * POST /api/track — pencatat hit pemakaian anonim.
 * Body: { kind: 'visit' | 'image' | 'pdf' | 'sample', downloads?: number }
 * Tidak menyimpan IP, nama file, maupun isi dokumen — hanya hitungan harian.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, json, rateLimit } from './_shared';

const KINDS = new Set(['visit', 'image', 'pdf', 'sample']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'method_not_allowed' });
    return;
  }
  if (!rateLimit(req, 60, 60_000)) {
    json(res, 429, { error: 'rate_limited' });
    return;
  }

  // Saklar jeda pencatatan (diatur dari #admin): saat jeda, hit diabaikan.
  try {
    const rows = (await (await getSql())`SELECT value FROM app_config WHERE key = 'tracking' LIMIT 1`) as {
      value?: { enabled?: boolean };
    }[];
    if (rows[0]?.value?.enabled === false) {
      json(res, 204, undefined);
      return;
    }
  } catch {
    /* DB gagal dicek → tetap catat (perilaku normal) */
  }

  const body = (req.body ?? {}) as { kind?: string; downloads?: number };
  const kind = body.kind;
  const downloads = Math.max(0, Math.min(1000, Math.floor(Number(body.downloads) || 0)));
  if (!kind || !KINDS.has(kind)) {
    json(res, 400, { error: 'bad_kind' });
    return;
  }

  try {
    await (await getSql())`
      INSERT INTO usage_daily (day, kind, loads, downloads)
      VALUES (CURRENT_DATE, ${kind}, ${kind === 'visit' ? 0 : 1}, ${downloads})
      ON CONFLICT (day, kind) DO UPDATE
      SET loads     = usage_daily.loads + ${kind === 'visit' ? 0 : 1},
          downloads = usage_daily.downloads + ${downloads}
    `;
    json(res, 204, undefined);
  } catch (err) {
    console.error('track failed', err);
    json(res, 500, { error: 'db_failed' });
  }
}
