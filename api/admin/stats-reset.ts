/**
 * POST /api/admin/stats-reset — hapus data statistik (wajib login, permanen).
 * Body (semua opsional, bisa dikombinasi):
 *   { from?: 'YYYY-MM-DD', to?: 'YYYY-MM-DD', kind?: 'visit'|'image'|'pdf'|'sample' }
 * Tanpa body = hapus SEMUA. Hapus selektif memungkinkan membersihkan data uji
 * coba tanpa menyentuh statistik pengunjung asli di tanggal lain.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, json } from '../_lib/db';
import { requireAdmin } from '../_lib/auth';

const KINDS = new Set(['visit', 'image', 'pdf', 'sample']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface ResetBody {
  from?: string;
  to?: string;
  kind?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'method_not_allowed' });
    return;
  }
  if (!requireAdmin(req)) {
    json(res, 401, { error: 'unauthorized' });
    return;
  }

  const body = (req.body ?? {}) as ResetBody;
  const from = body.from ? String(body.from) : undefined;
  const to = body.to ? String(body.to) : undefined;
  const kind = body.kind ? String(body.kind) : undefined;

  if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) {
    json(res, 400, { error: 'invalid_date' });
    return;
  }
  if (kind && !KINDS.has(kind)) {
    json(res, 400, { error: 'invalid_kind' });
    return;
  }

  try {
    const db = getSql();
    const conds: string[] = [];
    const params: string[] = [];
    if (from) conds.push(`day >= $${params.push(from)}`);
    if (to) conds.push(`day <= $${params.push(to)}`);
    if (kind) conds.push(`kind = $${params.push(kind)}`);

    const text =
      'WITH d AS (DELETE FROM usage_daily' +
      (conds.length ? ` WHERE ${conds.join(' AND ')}` : '') +
      ' RETURNING 1) SELECT count(*)::int AS n FROM d';
    const rows = (await db.query(text, params)) as { n: number }[];

    json(res, 200, { ok: true, deleted: rows[0]?.n ?? 0 });
  } catch (err) {
    console.error('stats-reset failed', err);
    json(res, 500, { error: 'db_failed' });
  }
}
