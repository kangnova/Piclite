/**
 * Klien statistik & remote config PicLite.
 * - trackUsage(): kirim hit anonim ke /api/track (fire-and-forget, gagal = diam).
 * - fetchAdsenseConfig(): baca konfigurasi iklan dari /api/adsense-config.
 * Privacy: yang dikirim HANYA jenis hitungan — tidak ada file, nama, atau isi.
 */

export type UsageKind = 'visit' | 'image' | 'pdf' | 'sample';

interface AdsenseConfig {
  enabled: boolean;
  testMode: boolean;
  client: string;
  slotHero: string;
  slotInline: string;
}

/** True bila berjalan di localhost — data uji tidak boleh masuk statistik. */
function isLocalhost(): boolean {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

/** Kirim satu hit pemakaian. Sesuai prinsip tool: gagal senyap, tidak mengganggu. */
export function trackUsage(kind: UsageKind, downloads = 0): void {
  if (isLocalhost()) return; // uji coba lokal tidak tercatat di dashboard
  try {
    const body = JSON.stringify({ kind, downloads });
    if (navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))) return;
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics tidak boleh pernah mengganggu pengguna */
  }
}

/** Ambil konfigurasi iklan dari server (hasil cache edge 5 menit). */
export async function fetchAdsenseConfig(): Promise<AdsenseConfig | null> {
  try {
    const res = await fetch('/api/adsense-config');
    if (!res.ok) return null;
    return (await res.json()) as AdsenseConfig;
  } catch {
    return null;
  }
}
