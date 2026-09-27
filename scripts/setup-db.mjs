/**
 * Setup database PicLite di Neon — idempotent (aman dijalankan berulang).
 * Pakai: npm run setup-db
 * Membaca DATABASE_URL dari .env lalu menjalankan api/schema.sql:
 * membuat tabel usage_daily + app_config (dengan nilai default AdSense).
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

const url = readEnv('DATABASE_URL');
if (!url) {
  console.error('\n❌ DATABASE_URL belum diisi di file .env');
  console.error('   1. Buka console.neon.tech → project Anda → bagian "Connection string".');
  console.error('   2. Copy string yang diawali postgresql://');
  console.error('   3. Tempel ke baris DATABASE_URL= di file .env\n');
  process.exit(1);
}

const sql = neon(url);
const schema = readFileSync('api/schema.sql', 'utf8');

/** Driver Neon HTTP menolak multi-statement: pisahkan per titik-koma. */
const statements = schema
  .split(';')
  .map((s) => s
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .trim())
  .filter(Boolean);

try {
  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log(`\n✅ Database siap! ${statements.length} statement dijalankan (tabel usage_daily & app_config).`);
  console.log('   Langkah berikutnya:');
  console.log('   • Isi ADMIN_PASSWORD & ADMIN_SECRET di .env');
  console.log('   • Jalankan "npm run dev" lalu buka http://localhost:5173/#admin\n');
} catch (err) {
  console.error('\n❌ Gagal menjalankan skema:', err.message ?? err);
  console.error('   Pastikan Connection String disalin lengkap (berisi password).\n');
  process.exit(1);
}
