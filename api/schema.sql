-- Skema database PicLite (jalankan SEKALI di Neon Console → SQL Editor).
-- Tabel ini menyimpan HANYA hitungan agregat — tidak ada data file pengguna.

-- Hitungan pemakaian harian per jenis (UPSERT += dari api/track)
CREATE TABLE IF NOT EXISTS usage_daily (
  day       date   NOT NULL,
  kind      text   NOT NULL, -- 'visit' | 'image' | 'pdf' | 'sample'
  loads     bigint NOT NULL DEFAULT 0,
  downloads bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (day, kind)
);

-- Konfigurasi remote (AdSense dll.) yang bisa diubah dari halaman #admin
CREATE TABLE IF NOT EXISTS app_config (
  key        text      PRIMARY KEY,
  value      jsonb     NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_config (key, value) VALUES
  ('adsense', '{"enabled": false, "testMode": false, "client": "", "slotHero": "", "slotInline": ""}'),
  ('tracking', '{"enabled": true}')
ON CONFLICT (key) DO NOTHING;
