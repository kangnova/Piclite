import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, RotateCcw, ShieldCheck } from 'lucide-react';
import UploadZone from './components/UploadZone';
import PreviewCard from './components/PreviewCard';
import PdfCard from './components/PdfCard';
import AdBanner from './components/AdBanner';
import { CompressPanel, ResizePanel, ConvertPanel } from './components/panels';
import { I18nProvider, useI18n, type Lang } from './i18n';
import {
  loadImage,
  processImage,
  formatBytes,
  savingsPercent,
  type OutputFormat,
  type SourceImage,
} from './lib/image';
import { isPdfFile } from './lib/filekind';
import { trackUsage } from './lib/usage';
import { trackEvent } from './lib/analytics';
import AdminPage from './components/AdminPage';
import { PrivacyPage, ContactPage } from './components/StaticPages';
import { countPdfPages, compressPdf, type PdfProcessResult } from './lib/pdf';

function PicLite() {
  const { t, lang, setLang } = useI18n();

  const [source, setSource] = useState<SourceImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'compress' | 'resize' | 'convert'>('compress');
  const [quality, setQuality] = useState(80);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [ratio, setRatio] = useState(true);
  const [format, setFormat] = useState<OutputFormat>('jpeg');
  const [result, setResult] = useState<ProcessResultState | null>(null);
  const [processing, setProcessing] = useState(false);
  const prevFileBase = useRef('');

  /* --- State mode PDF (terisi otomatis saat file .pdf diunggah) --- */
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfResult, setPdfResult] = useState<PdfProcessResult | null>(null);
  const [pdfProcessing, setPdfProcessing] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);

  const isPdf = pdfFile !== null;

  /* Hit kunjungan sekali per sesi browser (tab) untuk statistik admin. */
  useEffect(() => {
    try {
      if (!sessionStorage.getItem('piclite-counted-visit')) {
        sessionStorage.setItem('piclite-counted-visit', '1');
        trackUsage('visit');
      }
    } catch {
      trackUsage('visit');
    }
  }, []);

  /* Rute: /privacy, /kontak|/contact, /#admin — tanpa router eksternal. */
  const resolveRoute = (): 'app' | 'admin' | 'privacy' | 'contact' => {
    if (window.location.hash === '#admin') return 'admin';
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/privacy' || path === '/privasi') return 'privacy';
    if (path === '/contact' || path === '/kontak') return 'contact';
    return 'app';
  };
  const [route, setRoute] = useState(resolveRoute);
  useEffect(() => {
    const sync = () => setRoute(resolveRoute());
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  interface ProcessResultState {
    url: string;
    blob: Blob;
    width: number;
    height: number;
  }

  const aspect = useMemo(
    () => (source && height > 0 ? width / height : 1),
    [source, width, height],
  );

  /* Proses ulang secara reaktif setiap kontrol berubah (debounce ringan). */
  useEffect(() => {
    if (!source) return;
    setProcessing(true);
    const handle = setTimeout(() => {
      processImage(source, { format, quality, width, height })
        .then((res) => {
          setResult((prev) => {
            if (prev) URL.revokeObjectURL(prev.url);
            return res;
          });
        })
        .catch(() => setError(t('errLoad')))
        .finally(() => setProcessing(false));
    }, 120);
    return () => clearTimeout(handle);
  }, [source, format, quality, width, height, t]);

  /* Kompres PDF reaktif terhadap slider kualitas (debounce lebih panjang, rev lama dibatalkan). */
  useEffect(() => {
    if (!pdfFile) return;
    setPdfProcessing(true);
    setPdfProgress(null);
    let stale = false;
    const handle = setTimeout(() => {
      compressPdf(pdfFile, { quality }, (current, total) => {
        if (!stale) setPdfProgress({ current, total });
      })
        .then((res) => {
          if (stale) {
            URL.revokeObjectURL(res.url);
            return;
          }
          setPdfResult((prev) => {
            if (prev) URL.revokeObjectURL(prev.url);
            return res;
          });
        })
        .catch(() => {
          if (!stale) setError(t('errPdf'));
        })
        .finally(() => {
          if (!stale) setPdfProcessing(false);
        });
    }, 450);
    return () => {
      stale = true;
      clearTimeout(handle);
    };
  }, [pdfFile, quality, t]);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setResult(null);
      setPdfResult(null);
      setPdfProgress(null);
      setPdfPageCount(null);

      if (isPdfFile(file)) {
        if (source) URL.revokeObjectURL(source.url);
        setSource(null);
        prevFileBase.current = file.name.replace(/\.[^.]+$/, '');
        setPdfFile(file);
        setQuality(60); // default kompresi PDF scan
        countPdfPages(file).then(setPdfPageCount);
        trackUsage('pdf');
        trackEvent('file_loaded', 'pdf');
        return;
      }

      if (pdfFile) setPdfFile(null);
      try {
        const img = await loadImage(file);
        if (source) URL.revokeObjectURL(source.url);
        setSource(img);
        setWidth(img.width);
        setHeight(img.height);
        setRatio(true);
        setTab('compress');
        prevFileBase.current = file.name.replace(/\.[^.]+$/, '');
      } catch {
        setError(t('errLoad'));
        return;
      }
      trackUsage(file.name === 'piclite-sample.png' ? 'sample' : 'image');
      trackEvent('file_loaded', 'image');
    },
    [source, pdfFile, t],
  );

  const handleWidth = (value: number) => {
    setWidth(value);
    if (ratio && aspect > 0) setHeight(Math.max(1, Math.round(value / aspect)));
  };

  const handleHeight = (value: number) => {
    setHeight(value);
    if (ratio && value > 0) setWidth(Math.max(1, Math.round(value * aspect)));
  };

  const handleReset = () => {
    if (source) URL.revokeObjectURL(source.url);
    setResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setPdfResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setSource(null);
    setPdfFile(null);
    setPdfProgress(null);
    setPdfPageCount(null);
    setError(null);
  };

  const extMap: Record<OutputFormat, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' };

  const handleDownload = () => {
    if (isPdf) {
      if (!pdfResult || !pdfFile || pdfProcessing) return;
      const a = document.createElement('a');
      a.href = pdfResult.url;
      a.download = `${prevFileBase.current || 'document'}-piclite.pdf`;
      a.click();
      trackEvent('download', 'pdf', { quality: String(quality) });
      return;
    }
    if (!result || !source) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = `${prevFileBase.current || 'image'}-piclite.${extMap[format]}`;
    a.click();
    trackEvent('download', 'image', { format });
  };

  const percent = isPdf
    ? pdfResult && pdfFile
      ? savingsPercent(pdfFile.size, pdfResult.blob.size)
      : 0
    : result && source
      ? savingsPercent(source.file.size, result.blob.size)
      : 0;

  const busy = isPdf ? pdfProcessing : processing;
  const hasResult = isPdf ? !!pdfResult && !pdfProcessing : !!result && !processing;
  const pdfProgressPct =
    pdfProgress && pdfProgress.total > 0
      ? Math.round((pdfProgress.current / pdfProgress.total) * 100)
      : 0;

  /* Halaman non-aplikasi menggantikan UI utama (setelah semua hook). */
  if (route === 'admin') return <AdminPage />;
  if (route === 'privacy') return <PrivacyPage />;
  if (route === 'contact') return <ContactPage />;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="Logo PicLite" className="h-7 w-7" />
            <span className="text-lg font-extrabold tracking-tight">PicLite</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 text-xs font-semibold">
            {(['id', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`rounded-full px-2.5 py-1 uppercase transition ${
                  lang === l ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-12">
        {/* Hero */}
        <section className="pt-8 pb-6 text-center sm:pt-12">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
            {t('tagline')}
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">{t('heroSub')}</p>
          <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('privacyNote')}
          </p>
        </section>

        <AdBanner />

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Upload / Workspace */}
        {!source && !pdfFile ? (
          <section className="mt-4">
            <UploadZone onFile={handleFile} onError={setError} />
          </section>
        ) : (
          <section className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
            {/* Kolom kontrol */}
            <div className="space-y-4">
              {isPdf ? (
                <>
                  {/* Badge mode PDF otomatis */}
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                    {t('pdfMode')}
                  </div>
                  <CompressPanel quality={quality} onChange={setQuality} />
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">
                    {t('pdfNote')}
                  </p>
                </>
              ) : (
                <>
                  {/* Tab */}
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                    {(['compress', 'resize', 'convert'] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${
                          tab === key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {t(key)}
                      </button>
                    ))}
                  </div>

                  {tab === 'compress' && <CompressPanel quality={quality} onChange={setQuality} />}
                  {tab === 'resize' && (
                    <ResizePanel
                      width={width}
                      height={height}
                      ratio={ratio}
                      onWidth={handleWidth}
                      onHeight={handleHeight}
                      onToggleRatio={setRatio}
                    />
                  )}
                  {tab === 'convert' && <ConvertPanel format={format} onChange={setFormat} />}
                </>
              )}

              <button
                type="button"
                onClick={handleDownload}
                disabled={!hasResult}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Download className="h-4 w-4" />
                {busy ? '…' : t('download')}
                {hasResult && (
                  <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs font-semibold">
                    {formatBytes(
                      isPdf && pdfResult && pdfFile
                        ? pdfResult.blob.size
                        : result
                          ? result.blob.size
                          : 0,
                    )}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" />
                {t('reset')}
                {source && ` · ${source.file.name}`}
                {pdfFile && ` · ${pdfFile.name}`}
              </button>
            </div>

            {/* Kolom preview */}
            <div>
              {isPdf ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfCard
                    label={t('before')}
                    fileName={pdfFile.name}
                    pages={pdfPageCount ?? undefined}
                    pagesLabel={t('pages')}
                    sizeText={formatBytes(pdfFile.size)}
                    sizeLabel={t('fileSize')}
                  />
                  <PdfCard
                    label={t('after')}
                    fileName={`${prevFileBase.current || 'document'}-piclite.pdf`}
                    pages={pdfResult?.pageCount ?? pdfPageCount ?? undefined}
                    pagesLabel={t('pages')}
                    sizeText={pdfResult ? formatBytes(pdfResult.blob.size) : '…'}
                    sizeLabel={t('fileSize')}
                    highlight
                  />
                </div>
              ) : (
                source && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PreviewCard
                      label={t('before')}
                      src={source.url}
                      width={source.width}
                      height={source.height}
                      sizeText={formatBytes(source.file.size)}
                      resolutionLabel={t('resolution')}
                      sizeLabel={t('fileSize')}
                    />
                    <PreviewCard
                      label={t('after')}
                      src={result?.url ?? source.url}
                      width={result?.width ?? source.width}
                      height={result?.height ?? source.height}
                      sizeText={result ? formatBytes(result.blob.size) : '…'}
                      resolutionLabel={t('resolution')}
                      sizeLabel={t('fileSize')}
                      highlight
                    />
                  </div>
                )
              )}
              {busy && isPdf && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>
                      {t('processingPage')} {pdfProgress?.current ?? 0} {t('of')}{' '}
                      {pdfProgress?.total ?? pdfPageCount ?? '…'}
                    </span>
                    <span>{pdfProgressPct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-200"
                      style={{ width: `${pdfProgressPct}%` }}
                    />
                  </div>
                </div>
              )}
              {hasResult && (
                <p className="mt-3 text-center text-sm font-medium">
                  {percent > 0 ? (
                    <span className="text-emerald-600">
                      ↓ {percent}% {t('smaller')}
                    </span>
                  ) : percent < 0 ? (
                    <span className="text-amber-600">
                      ↑ {Math.abs(percent)}% {t('larger')}
                    </span>
                  ) : (
                    <span className="text-slate-500">{t('sameSize')}</span>
                  )}
                </p>
              )}
              {hasResult && (
                <div className="mt-6">
                  <AdBanner slot="inline" />
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Konten SEO: menarget keyword kompres PDF & gambar (bilingual) */}
      <section className="border-t border-slate-100 bg-white px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-4 text-sm leading-relaxed text-slate-600">
          <h2 className="text-lg font-bold text-slate-900">{t('seoPdfTitle')}</h2>
          <p>{t('seoPdfBody1')}</p>
          <p>{t('seoPdfBody2')}</p>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-4 text-center text-xs text-slate-400">
          <span>PicLite © {new Date().getFullYear()} · {t('footerMade')}</span>
          <a href="/privacy" className="hover:text-slate-600">{t('privacyPolicy')}</a>
          <a href="/contact" className="hover:text-slate-600">{t('contactUs')}</a>
          <a href="/#admin" className="hover:text-slate-600">{t('adminPanel')}</a>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <PicLite />
    </I18nProvider>
  );
}
