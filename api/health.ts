/**
 * GET /api/health — diagnostik runtime produksi (tanpa data sensitif).
 * Melaporkan: versi Node, keberadaan env var, hasil import driver Neon,
 * dan tes query nyata. Selalu 200 supaya gagal pun terbaca penyebabnya.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const steps: Record<string, string> = {};

  try {
    steps.node = process.version;
  } catch (e) {
    steps.node = `fail: ${(e as Error).message}`;
  }

  try {
    steps.env_database_url = process.env.DATABASE_URL ? 'present' : 'MISSING';
  } catch (e) {
    steps.env_database_url = `fail: ${(e as Error).message}`;
  }

  try {
    const mod = await import('@neondatabase/serverless');
    steps.neon_import = 'ok';
    steps.neon_export_type = typeof mod.neon;
  } catch (e) {
    steps.neon_import = `fail: ${(e as Error).message}`;
  }

  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL as string);
    const rows = (await sql`SELECT count(*)::int AS n FROM app_config`) as { n: number }[];
    steps.db_query = `ok (app_config rows: ${rows[0]?.n})`;
  } catch (e) {
    steps.db_query = `fail: ${(e as Error).message}`;
  }

  res.status(200).json({ steps, vercel_region: process.env.VERCEL_REGION ?? 'unknown' });
}
