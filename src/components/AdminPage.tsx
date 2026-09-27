/**
 * Halaman Admin PicLite (diakses via /#admin) — khusus pemilik tool.
 * Fitur: login password, statistik pemakaian (harian/mingguan/bulanan/
 * tahunan) + grafik 30 hari, dan pengelolaan AdSense tanpa edit kode.
 * Label dalam Bahasa Indonesia karena hanya dipakai admin.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';

interface KindStat {
  loads: number;
  downloads: number;
}

interface StatsData {
  totals: Record<string, KindStat>;
  series: { day: string; kinds: Record<string, KindStat> }[];
  activeDays: number;
}

interface AdsenseConfig {
  enabled: boolean;
  testMode: boolean;
  client: string;
  slotHero: string;
  slotInline: string;
}

const KIND_LABEL: Record<string, string> = {
  visit: 'Kunjungan',
  image: 'Gambar diproses',
  pdf: 'PDF diproses',
  sample: 'Contoh dipakai',
};

/** Jumlahkan loads untuk jendela waktu tertentu dari deret harian. */
function sumWindow(series: StatsData['series'], days: number): { visits: number; loads: number; downloads: number } {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  let visits = 0;
  let loads = 0;
  let downloads = 0;
  for (const entry of series) {
    if (entry.day < cutoffStr) continue;
    visits += entry.kinds.visit?.loads ?? 0;
    loads += (entry.kinds.image?.loads ?? 0) + (entry.kinds.pdf?.loads ?? 0) + (entry.kinds.sample?.loads ?? 0);
    downloads +=
      (entry.kinds.image?.downloads ?? 0) +
      (entry.kinds.pdf?.downloads ?? 0) +
      (entry.kinds.sample?.downloads ?? 0);
  }
  return { visits, loads, downloads };
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = memeriksa
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [adsense, setAdsense] = useState<AdsenseConfig | null>(null);
  const [savingAdsense, setSavingAdsense] = useState(false);
  const [adsenseMsg, setAdsenseMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const [selFrom, setSelFrom] = useState('');
  const [selTo, setSelTo] = useState('');
  const [selKind, setSelKind] = useState('');
  const [selConfirm, setSelConfirm] = useState(false);
  const [selMsg, setSelMsg] = useState<string | null>(null);

  /* ---- Sesi: coba muat stats; 401 berarti belum login ---- */
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const data = (await res.json()) as StatsData;
      setStats(data);
      setAuthed(true);
    } catch {
      setAuthed(false);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadAdsense = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/adsense');
      if (res.ok) setAdsense((await res.json()) as AdsenseConfig);
    } catch {
      /* form tetap kosong */
    }
  }, []);

  const loadTracking = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tracking');
      if (res.ok) {
        const data = (await res.json()) as { enabled: boolean };
        setTrackingEnabled(data.enabled);
      }
    } catch {
      /* default aktif */
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (authed) {
      void loadAdsense();
      void loadTracking();
    }
  }, [authed, loadAdsense, loadTracking]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setLoginError(res.status === 429 ? 'Terlalu banyak percobaan. Coba lagi 15 menit.' : 'Password salah.');
        return;
      }
      setPassword('');
      await loadStats();
    } catch {
      setLoginError('Gagal terhubung ke server.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      /* abaikan */
    }
    setAuthed(false);
    setStats(null);
    setAdsense(null);
  };

  const handleSaveAdsense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adsense) return;
    setSavingAdsense(true);
    setAdsenseMsg(null);
    try {
      const res = await fetch('/api/admin/adsense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adsense),
      });
      if (res.ok) {
        setAdsenseMsg({ ok: true, text: 'Tersimpan. Perubahan live dalam ±5 menit (cache edge).' });
      } else if (res.status === 400) {
        setAdsenseMsg({ ok: false, text: 'Format tidak valid. Client: ca-pub-XXXX, Slot: angka 8–12 digit.' });
      } else {
        setAdsenseMsg({ ok: false, text: 'Gagal menyimpan. Coba lagi.' });
      }
    } catch {
      setAdsenseMsg({ ok: false, text: 'Gagal terhubung ke server.' });
    } finally {
      setSavingAdsense(false);
    }
  };

  const handleToggleTracking = async (enabled: boolean) => {
    setTrackingEnabled(enabled);
    try {
      await fetch('/api/admin/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
    } catch {
      setTrackingEnabled(!enabled); // gagal → kembalikan tampilan
    }
  };

  const handleResetStats = async () => {
    setResetMsg(null);
    try {
      const res = await fetch('/api/admin/stats-reset', { method: 'POST' });
      const data = (await res.json()) as { deleted?: number };
      setResetMsg(res.ok ? `✅ ${data.deleted ?? 0} baris terhapus — statistik kembali nol.` : '❌ Gagal menghapus data.');
      if (res.ok) {
        setResetConfirm(false);
        await loadStats();
      }
    } catch {
      setResetMsg('❌ Gagal terhubung ke server.');
    }
  };

  /** Hapus selektif: hanya rentang/jenis yang dipilih — data lain tetap utuh. */
  const handleSelectiveDelete = async () => {
    setSelMsg(null);
    const body: Record<string, string> = {};
    if (selFrom) body.from = selFrom;
    if (selTo) body.to = selTo;
    if (selKind) body.kind = selKind;
    if (Object.keys(body).length === 0) {
      setSelMsg('Isi minimal satu filter (tanggal atau jenis).');
      return;
    }
    try {
      const res = await fetch('/api/admin/stats-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { deleted?: number };
      if (res.ok) {
        setSelMsg(`✅ ${data.deleted ?? 0} baris terhapus — data di luar filter tetap utuh.`);
        setSelConfirm(false);
        await loadStats();
      } else {
        setSelMsg('❌ Gagal menghapus data.');
      }
    } catch {
      setSelMsg('❌ Gagal terhubung ke server.');
    }
  };

  /* ---- Turunan statistik ---- */
  const today = useMemo(() => sumWindow(stats?.series ?? [], 1), [stats]);
  const week = useMemo(() => sumWindow(stats?.series ?? [], 7), [stats]);
  const month = useMemo(() => sumWindow(stats?.series ?? [], 30), [stats]);
  const year = useMemo(() => sumWindow(stats?.series ?? [], 365), [stats]);

  /** Grafik 30 hari terakhir: kunjungan + pemakaian per hari. */
  const chart = useMemo(() => {
    const list = (stats?.series ?? []).slice(-30);
    const max = Math.max(1, ...list.map((d) => (d.kinds.visit?.loads ?? 0) + (d.kinds.image?.loads ?? 0) + (d.kinds.pdf?.loads ?? 0)));
    return { list, max };
  }, [stats]);

  /* ------------------------- Belum login ------------------------- */
  if (authed === null) {
    return <Centered><p className="text-sm text-slate-500">Memeriksa sesi…</p></Centered>;
  }

  if (!authed) {
    return (
      <Centered>
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <h1 className="text-lg font-bold">Admin PicLite</h1>
          </div>
          <p className="text-xs text-slate-500">Masukkan password admin untuk melihat statistik & kelola iklan.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password admin"
            autoFocus
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {loginError && <p className="text-xs font-medium text-red-600">{loginError}</p>}
          <button
            type="submit"
            disabled={loggingIn || !password}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:bg-slate-300"
          >
            {loggingIn ? 'Memeriksa…' : 'Masuk'}
          </button>
          <a href="/" className="block text-center text-xs text-slate-400 hover:text-slate-600">← Kembali ke aplikasi</a>
        </form>
      </Centered>
    );
  }

  /* --------------------------- Sudah login --------------------------- */
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            <span className="font-extrabold tracking-tight">Admin PicLite</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadStats()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${statsLoading ? 'animate-spin' : ''}`} /> Muat ulang
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              <LogOut className="h-3.5 w-3.5" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        {/* ---------- Statistik ---------- */}
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Pemakaian Tool</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard title="Hari ini" visits={today.visits} loads={today.loads} downloads={today.downloads} />
            <StatCard title="7 hari" visits={week.visits} loads={week.loads} downloads={week.downloads} />
            <StatCard title="30 hari" visits={month.visits} loads={month.loads} downloads={month.downloads} />
            <StatCard title="1 tahun" visits={year.visits} loads={year.loads} downloads={year.downloads} />
          </div>

          {/* Total sepanjang waktu */}
          {stats && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
              {Object.entries(stats.totals).map(([kind, s]) => (
                <span key={kind} className="rounded-full bg-white px-3 py-1 shadow-sm">
                  {KIND_LABEL[kind] ?? kind}: <b className="text-slate-800">{s.loads.toLocaleString('id-ID')}</b>
                  {s.downloads > 0 && <span className="text-slate-400"> · {s.downloads.toLocaleString('id-ID')} download</span>}
                </span>
              ))}
            </div>
          )}

          {/* Grafik 30 hari */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-xs font-semibold text-slate-500">Kunjungan & pemakaian — 30 hari terakhir</p>
            {chart.list.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Belum ada data. Buka halaman utama untuk menghasilkan hit.</p>
            ) : (
              <svg viewBox="0 0 600 160" className="h-40 w-full" preserveAspectRatio="none" role="img" aria-label="Grafik pemakaian 30 hari">
                {chart.list.map((d, i) => {
                  const visits = d.kinds.visit?.loads ?? 0;
                  const loads = (d.kinds.image?.loads ?? 0) + (d.kinds.pdf?.loads ?? 0);
                  const bw = 600 / chart.list.length;
                  const hv = (visits / chart.max) * 140;
                  const hl = (loads / chart.max) * 140;
                  return (
                    <g key={d.day}>
                      <rect x={i * bw + 1} y={150 - hv} width={Math.max(1, bw - 2)} height={hv} fill="#a5b4fc" rx="1.5" />
                      <rect x={i * bw + 1} y={150 - hv - hl} width={Math.max(1, bw - 2)} height={hl} fill="#4f46e5" rx="1.5" />
                      <title>{`${d.day}: ${visits} kunjungan, ${loads} pemakaian`}</title>
                    </g>
                  );
                })}
              </svg>
            )}
            <div className="mt-2 flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-indigo-600" /> Pemakaian tool</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-indigo-300" /> Kunjungan</span>
            </div>
          </div>
        </section>

        {/* ---------- AdSense ---------- */}
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Google AdSense (tanpa edit kode)</h2>
          {adsense && (
            <form onSubmit={handleSaveAdsense} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center gap-6">
                <Toggle
                  label="Aktifkan iklan"
                  checked={adsense.enabled}
                  onChange={(v) => setAdsense({ ...adsense, enabled: v })}
                />
                <Toggle
                  label="Mode test (impresi tidak dihitung)"
                  checked={adsense.testMode}
                  onChange={(v) => setAdsense({ ...adsense, testMode: v })}
                />
              </div>
              <Field
                label="AdSense Client ID"
                hint="Format: ca-pub-XXXXXXXXXX (dari AdSense → Akun → Info akun)"
                value={adsense.client}
                onChange={(v) => setAdsense({ ...adsense, client: v })}
                placeholder="ca-pub-1234567890123456"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Slot ID — bawah hero"
                  hint="Angka 8–12 digit dari unit iklan display"
                  value={adsense.slotHero}
                  onChange={(v) => setAdsense({ ...adsense, slotHero: v })}
                  placeholder="1234567890"
                />
                <Field
                  label="Slot ID — bawah preview (siap dipakai)"
                  hint="Bisa diisi sama atau unit berbeda"
                  value={adsense.slotInline}
                  onChange={(v) => setAdsense({ ...adsense, slotInline: v })}
                  placeholder="0987654321"
                />
              </div>
              {adsenseMsg && (
                <p className={`text-xs font-medium ${adsenseMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{adsenseMsg.text}</p>
              )}
              <button
                type="submit"
                disabled={savingAdsense}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:bg-slate-300"
              >
                {savingAdsense ? 'Menyimpan…' : 'Simpan konfigurasi'}
              </button>
            </form>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Slot “bawah preview” otomatis tampil di bawah kartu hasil saat iklan aktif. Gunakan mode test dulu untuk
            memastikan penempatan benar sebelum data produksi.
          </p>
        </section>

        {/* ---------- Perawatan data ---------- */}
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Perawatan Data (uji coba)</h2>
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <Toggle
                label="Catat statistik pengunjung"
                checked={trackingEnabled}
                onChange={(v) => void handleToggleTracking(v)}
              />
              <p className="mt-1 text-xs text-slate-400">
                Matikan saat masa uji coba: semua hit dari pengunjung diabaikan dan dashboard tidak bertambah.
                Aktifkan kembali saat siap mulai mengukur data asli. Hit dari localhost/127.0.0.1 juga selalu
                diabaikan otomatis — pengujian lokal tidak pernah masuk statistik.
              </p>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-sm font-semibold text-slate-700">Hapus data uji coba (selektif)</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Hapus hanya rentang tanggal/jenis tertentu — misal hit tes kemarin — tanpa menyentuh statistik
                pengunjung asli di tanggal lain. Kosongkan tanggal = semua tanggal.
              </p>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                <label className="text-xs text-slate-500">
                  Dari
                  <input
                    type="date"
                    value={selFrom}
                    onChange={(e) => setSelFrom(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Sampai
                  <input
                    type="date"
                    value={selTo}
                    onChange={(e) => setSelTo(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Jenis
                  <select
                    value={selKind}
                    onChange={(e) => setSelKind(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">Semua jenis</option>
                    <option value="visit">Kunjungan</option>
                    <option value="image">Gambar diproses</option>
                    <option value="pdf">PDF diproses</option>
                    <option value="sample">Contoh dipakai</option>
                  </select>
                </label>
              </div>
              {selMsg && <p className="mt-1.5 text-xs font-medium text-slate-600">{selMsg}</p>}
              <div className="mt-2 flex gap-2">
                {!selConfirm ? (
                  <button
                    type="button"
                    onClick={() => setSelConfirm(true)}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                  >
                    Hapus sesuai filter
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleSelectiveDelete()}
                      className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700"
                    >
                      Ya, hapus sesuai filter
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelConfirm(false)}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600"
                    >
                      Batal
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-sm font-semibold text-slate-700">Hapus semua data statistik</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Mengosongkan seluruh hitungan (kunjungan, pemakaian, download) — permanen, termasuk data uji coba.
              </p>
              {resetMsg && <p className="mt-1.5 text-xs font-medium text-slate-600">{resetMsg}</p>}
              <div className="mt-2.5 flex gap-2">
                {!resetConfirm ? (
                  <button
                    type="button"
                    onClick={() => setResetConfirm(true)}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
                  >
                    Reset statistik
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleResetStats()}
                      className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                    >
                      Ya, hapus semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetConfirm(false)}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600"
                    >
                      Batal
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ------------------------- Komponen kecil ------------------------- */

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">{children}</div>;
}

function StatCard({ title, visits, loads, downloads }: { title: string; visits: number; loads: number; downloads: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{loads.toLocaleString('id-ID')}</p>
      <p className="text-xs text-slate-500">pemakaian tool</p>
      <p className="mt-1 text-xs text-slate-400">
        {visits.toLocaleString('id-ID')} kunjungan · {downloads.toLocaleString('id-ID')} download
      </p>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
      />
      {label}
    </label>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
      />
      {hint && <span className="mt-0.5 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
