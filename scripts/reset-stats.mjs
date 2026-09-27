/**
 * Reset statistik PicLite langsung dari terminal (tanpa login admin).
 * Pakai:
 *   npm run reset-stats                        → hapus SEMUA data usage_daily
 *   npm run reset-stats -- 2026-09-25          → hapus sebelum tanggal (YYYY-MM-DD)
 *   npm run reset-stats -- --from 2026-09-27 --to 2026-09-27   → rentang inklusif
 *   npm run reset-stats -- --kind visit        → satu jenis saja
 * Kombinasi --from/--to/--kind boleh dipakai bersamaan.
 */
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

function readEnv(key) {
  try {
    const text = readFileSync('.env', 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* .env belum ada */
  }
  return process.env[key] ?? '';
}

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
}

const before = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const from = flag('--from');
const to = flag('--to');
const kind = flag('--kind');

const url = readEnv('DATABASE_URL');
if (!url) {
  console.error('❌ DATABASE_URL belum diisi di .env');
  process.exit(1);
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
for (const [label, value] of [['--from', from], ['--to', to]]) {
  if (value && !DATE_RE.test(value)) {
    console.error(`❌ ${label} harus format YYYY-MM-DD`);
    process.exit(1);
  }
}
if (kind && !['visit', 'image', 'pdf', 'sample'].includes(kind)) {
  console.error('❌ --kind harus salah satu dari: visit, image, pdf, sample');
  process.exit(1);
}

const sql = neon(url);
try {
  const conds = [];
  const params = [];
  if (before) conds.push(`day < $${params.push(before)}`);
  if (from) conds.push(`day >= $${params.push(from)}`);
  if (to) conds.push(`day <= $${params.push(to)}`);
  if (kind) conds.push(`kind = $${params.push(kind)}`);

  const text =
    'WITH d AS (DELETE FROM usage_daily' +
    (conds.length ? ` WHERE ${conds.join(' AND ')}` : '') +
    ' RETURNING 1) SELECT count(*)::int AS n FROM d';
  const deleted = await sql.query(text, params);
  console.log(`✅ ${deleted[0].n} baris terhapus. Statistik dibersihkan.`);
} catch (err) {
  console.error('❌ Gagal:', err.message ?? err);
  process.exit(1);
}
