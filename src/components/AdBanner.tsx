/**
 * Slot iklan dinamis — konfigurasi AdSense dikelola dari halaman /#admin
 * (tersimpan di database, tanpa edit kode).
 *
 * Aktif: penuhi Client ID (ca-pub-...) & Slot ID di #admin → toggle Enabled.
 * Test mode: `google_adtest=on` agar impresi tidak mengganggu data produksi.
 */
import { useEffect, useState } from 'react';
import { fetchAdsenseConfig } from '../lib/usage';

const CONFIG_CACHE_KEY = 'piclite-adsense-config';
const CONFIG_CACHE_TTL = 5 * 60 * 1000;

interface AdsenseConfig {
  enabled: boolean;
  testMode: boolean;
  client: string;
  slotHero: string;
  slotInline: string;
}

let cachedConfig: AdsenseConfig | null = null;

function readCache(): AdsenseConfig | null {
  if (cachedConfig) return cachedConfig;
  try {
    const raw = sessionStorage.getItem(CONFIG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; v: AdsenseConfig };
    if (Date.now() - parsed.t > CONFIG_CACHE_TTL) return null;
    cachedConfig = parsed.v;
    return cachedConfig;
  } catch {
    return null;
  }
}

function writeCache(config: AdsenseConfig): void {
  cachedConfig = config;
  try {
    sessionStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify({ t: Date.now(), v: config }));
  } catch {
    /* abaikan */
  }
}

/** Muat script adsbygoogle sekali per halaman. */
function ensureAdsenseScript(client: string): void {
  if (document.querySelector('script[data-piclite-adsense]')) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  script.setAttribute('crossorigin', 'anonymous');
  script.setAttribute('data-piclite-adsense', client);
  document.head.appendChild(script);
}

export default function AdBanner({ slot = 'hero' }: { slot?: 'hero' | 'inline' }) {
  const [config, setConfig] = useState<AdsenseConfig | null>(() => readCache());

  useEffect(() => {
    let alive = true;
    fetchAdsenseConfig().then((next) => {
      if (!alive || !next) return;
      writeCache(next);
      setConfig(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  const slotId = config ? (slot === 'inline' ? config.slotInline : config.slotHero) : '';

  useEffect(() => {
    if (!config?.enabled || !config.client || !slotId) return;
    ensureAdsenseScript(config.client);
    try {
      (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ??= [];
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle.push({});
    } catch {
      /* script belum siap — iklan muncul di render berikutnya */
    }
  }, [config, slotId]);

  if (!config?.enabled || !config.client || !slotId) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center text-xs text-slate-400">
        Ad slot — kelola konfigurasi AdSense dari halaman admin (#admin), tanpa edit kode
      </div>
    );
  }

  return (
    <ins
      className="adsbygoogle block"
      style={{ display: 'block' }}
      data-ad-client={config.client}
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
      {...(config.testMode ? { 'data-adtest': 'on' } : {})}
    />
  );
}
