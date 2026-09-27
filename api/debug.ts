/**
 * GET /api/debug — bisection diagnostik rantai modul bersama.
 * Menguji: dynamic import _shared → getSql → query nyata. Selalu 200.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const steps: Record<string, string> = {};
  try {
    const shared = await import('./_shared');
    steps.shared_import = 'ok';
    steps.has_json = typeof shared.json;
    const sql = await shared.getSql();
    steps.sql_client = 'ok';
    const rows = (await sql`SELECT count(*)::int AS n FROM app_config`) as { n: number }[];
    steps.query = `ok rows=${rows[0]?.n}`;
  } catch (e) {
    const err = e as Error;
    steps.error = err?.message ?? String(e);
    steps.stack = (err?.stack ?? '').split('\n').slice(0, 3).join(' | ');
  }
  res.status(200).json(steps);
}
