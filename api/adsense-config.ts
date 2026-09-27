/**
 * GET /api/adsense-config — konfigurasi iklan untuk klien (publik).
 * Fail-safe: bila database gagal dibaca, iklan dianggap nonaktif.
 * Cache edge 5 menit agar murah dan cepat.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, json } from '../server/db';

export interface PublicAdsenseConfig {
  enabled: boolean;
  testMode: boolean;
  client: string;
  slotHero: string;
  slotInline: string;
}

const DEFAULT_CONFIG: PublicAdsenseConfig = {
  enabled: false,
  testMode: false,
  client: '',
  slotHero: '',
  slotInline: '',
};

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  try {
    const rows = (await (await getSql())`SELECT value FROM app_config WHERE key = 'adsense' LIMIT 1`) as {
      value?: Partial<PublicAdsenseConfig>;
    }[];
    const value = rows[0]?.value ?? {};
    json(res, 200, { ...DEFAULT_CONFIG, ...value });
  } catch (err) {
    console.error('adsense-config failed', err);
    json(res, 200, DEFAULT_CONFIG);
  }
}
