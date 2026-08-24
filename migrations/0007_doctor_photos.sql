CREATE TABLE IF NOT EXISTS doctor_photos (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  asset_key TEXT NOT NULL UNIQUE,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_doctor_photos_doctor ON doctor_photos(doctor_id, sort_order, created_at);
