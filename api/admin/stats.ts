/**
 * GET /api/admin/stats — statistik pemakaian (wajib login admin).
 * Mengembalikan total per kind, rata-rata harian, dan deret harian 365 hari
 * terakhir untuk digambar grafik di halaman admin.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, json } from '../../server/db';
import { requireAdmin } from '../../server/auth';

interface UsageRow {
  kind: string;
  loads: string;
  downloads: string;
}

interface DailyRow {
  day: string;
  kind: string;
  loads: string;
  downloads: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    json(res, 405, { error: 'method_not_allowed' });
    return;
  }
  if (!requireAdmin(req)) {
    json(res, 401, { error: 'unauthorized' });
    return;
  }

  try {
    const db = getSql();

    const totals = (await db`
      SELECT kind,
             COALESCE(SUM(loads), 0)     AS loads,
             COALESCE(SUM(downloads), 0) AS downloads
      FROM usage_daily
      GROUP BY kind
    `) as UsageRow[];

    const daily = (await db`
      SELECT day::text, kind, loads, downloads
      FROM usage_daily
      WHERE day > CURRENT_DATE - INTERVAL '365 days'
      ORDER BY day
    `) as DailyRow[];

    const totalByKind: Record<string, { loads: number; downloads: number }> = {};
    for (const row of totals) {
      totalByKind[row.kind] = { loads: Number(row.loads), downloads: Number(row.downloads) };
    }
    for (const kind of ['visit', 'image', 'pdf', 'sample']) {
      totalByKind[kind] ??= { loads: 0, downloads: 0 };
    }

    // Deret harian digabung per tanggal agar mudah digambar di klien.
    const byDay = new Map<string, Record<string, { loads: number; downloads: number }>>();
    for (const row of daily) {
      const entry = byDay.get(row.day) ?? {};
      entry[row.kind] = { loads: Number(row.loads), downloads: Number(row.downloads) };
      byDay.set(row.day, entry);
    }
    const series = [...byDay.entries()].map(([day, kinds]) => ({ day, kinds }));

    // Estimasi rentang aktif untuk rata-rata harian.
    const firstRow = (await db`SELECT MIN(day)::text AS first FROM usage_daily`) as { first: string | null }[];
    const firstDay = firstRow[0]?.first ?? null;
    const activeDays =
      firstDay !== null
        ? Math.max(1, Math.ceil((Date.now() - new Date(firstDay).getTime()) / 86_400_000))
        : 1;

    json(res, 200, { totals: totalByKind, series, activeDays });
  } catch (err) {
    console.error('stats failed', err);
    json(res, 500, { error: 'db_failed' });
  }
}
