/**
 * Statistik pengunjung PicLite — ringan, tanpa cookie, aktif via env var build.
 *
 * - Cloudflare Web Analytics (VITE_CF_BEACON_TOKEN): page view, kunjungan
 *   unik, negara, referrer — gratis dan tanpa cookie. Cukup untuk melihat
 *   pertumbuhan traffic menuju syarat apply AdSense.
 * - Google Analytics 4 (VITE_GA_ID): opsional, dipakai untuk event engagement
 *   (`file_loaded`, `download`) yang menunjukkan tool benar-benar dipakai.
 *
 * Jika kedua env kosong, modul menjadi no-op — tidak ada byte yang terkirim.
 * Nama file dan isi dokumen TIDAK PERNAH dikirim ke mana pun.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Injeksi script analytics sekali di startup (panggil dari main.tsx). */
export function initAnalytics(): void {
  if (typeof document === 'undefined') return;

  const cfToken = import.meta.env.VITE_CF_BEACON_TOKEN as string | undefined;
  if (cfToken) {
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.setAttribute('data-cf-beacon', JSON.stringify({ token: cfToken }));
    document.head.appendChild(script);
  }

  const ga = import.meta.env.VITE_GA_ID as string | undefined;
  if (ga) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ga}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', ga, { anonymize_ip: true });
  }
}

/** Kirim event engagement (aman dipanggil kapan pun; no-op tanpa GA4). */
export function trackEvent(
  name: 'file_loaded' | 'download',
  kind: 'image' | 'pdf',
  extra?: Record<string, string>,
): void {
  window.gtag?.('event', name, { kind, ...extra });
}
