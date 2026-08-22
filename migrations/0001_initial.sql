-- Initial Doctors Directory schema.
-- Keep future structural changes in a new numbered migration file and apply
-- the same migration to local first, then remote.

CREATE TABLE IF NOT EXISTS preapproved_phones (
  phone TEXT PRIMARY KEY,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS specialties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name_fa TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS doctors (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  slug TEXT,
  specialty_id INTEGER REFERENCES specialties(id),
  specialty_main TEXT,
  city TEXT,
  phone_public TEXT,
  medical_council_number TEXT,
  email TEXT,
  bio TEXT,
  avatar_key TEXT,
  card_template TEXT DEFAULT 'default',
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_doctors_status ON doctors(status);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty_main);
CREATE INDEX IF NOT EXISTS idx_doctors_city ON doctors(city);
CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_specialty_slug ON doctors(specialty_id, slug);

CREATE TABLE IF NOT EXISTS work_locations (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  address TEXT,
  days_of_week TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_work_locations_doctor ON work_locations(doctor_id);

CREATE TABLE IF NOT EXISTS social_links (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  value TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'members',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_social_links_doctor ON social_links(doctor_id);

CREATE TABLE IF NOT EXISTS dynamic_fields (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_value TEXT,
  visibility TEXT NOT NULL DEFAULT 'members',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dynamic_fields_doctor ON dynamic_fields(doctor_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_fields_key ON dynamic_fields(field_key);

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  recommended_name TEXT NOT NULL,
  specialty TEXT,
  city TEXT,
  phone TEXT,
  notes TEXT,
  submitted_by_doctor_id TEXT REFERENCES doctors(id),
  linked_doctor_id TEXT REFERENCES doctors(id),
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_referrals_specialty ON referrals(specialty);
CREATE INDEX IF NOT EXISTS idx_referrals_city ON referrals(city);
