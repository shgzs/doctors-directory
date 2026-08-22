-- ==========================================================
-- Doctors Directory — Cloudflare D1 Schema
-- ==========================================================

-- Pre-approved phone list: numbers you already have, allowed to
-- self-register without admin approval.
CREATE TABLE IF NOT EXISTS preapproved_phones (
  phone TEXT PRIMARY KEY,      -- normalized e.g. 989121234567
  note  TEXT,                  -- optional: "همکلاسی 1390"
  created_at TEXT DEFAULT (datetime('now'))
);

-- Specialties lookup: maps a short latin slug (used in subdomains/paths,
-- e.g. "radio") to the real (Persian) specialty name.
CREATE TABLE IF NOT EXISTS specialties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,   -- e.g. "radio", "cardio", "derma"
  name_fa TEXT NOT NULL        -- e.g. "رادیولوژی"
);

-- Core doctor profile
CREATE TABLE IF NOT EXISTS doctors (
  id TEXT PRIMARY KEY,                 -- uuid, used in canonical /d/{id} URLs
  phone TEXT UNIQUE NOT NULL,          -- normalized, used for OTP login
  full_name TEXT NOT NULL,
  slug TEXT,                           -- latin nickname for pretty URLs, e.g. "ghasemi"
  specialty_id INTEGER REFERENCES specialties(id),
  specialty_main TEXT,                 -- free-text specialty label shown on profile
  city TEXT,
  phone_public TEXT,                   -- shown to everyone
  medical_council_number TEXT,
  email TEXT,
  bio TEXT,
  avatar_key TEXT,                     -- KV key for the uploaded avatar
  card_template TEXT DEFAULT 'default',-- chosen business-card template
  role TEXT NOT NULL DEFAULT 'member', -- member | admin
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_doctors_status ON doctors(status);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty_main);
CREATE INDEX IF NOT EXISTS idx_doctors_city ON doctors(city);

-- A doctor's slug only needs to be unique within their own specialty —
-- two doctors in different fields can share a nickname.
CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_specialty_slug
  ON doctors(specialty_id, slug);

-- Work locations (a doctor can have several; each with its own days)
CREATE TABLE IF NOT EXISTS work_locations (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  address TEXT,
  days_of_week TEXT,   -- JSON array e.g. ["sat","mon","wed"]
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_work_locations_doctor ON work_locations(doctor_id);

-- Social / messaging links (whatsapp, telegram, instagram, website, ...)
CREATE TABLE IF NOT EXISTS social_links (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,     -- whatsapp | telegram | instagram | linkedin | website | other
  value TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'members', -- public | members | private
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_social_links_doctor ON social_links(doctor_id);

-- Extensible free-form fields (sub-specialties, family info, anything new later)
CREATE TABLE IF NOT EXISTS dynamic_fields (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,        -- e.g. "sub_specialty", "kids", "languages"
  field_value TEXT,               -- plain text or JSON string
  visibility TEXT NOT NULL DEFAULT 'members', -- public | members | private
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dynamic_fields_doctor ON dynamic_fields(doctor_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_fields_key ON dynamic_fields(field_key);

-- Doctor referrals / recommendations (recommended person need not be a member)
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  recommended_name TEXT NOT NULL,
  specialty TEXT,
  city TEXT,
  phone TEXT,
  notes TEXT,                      -- why recommended / experience
  submitted_by_doctor_id TEXT REFERENCES doctors(id),
  linked_doctor_id TEXT REFERENCES doctors(id), -- if the recommended person is also a member
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_referrals_specialty ON referrals(specialty);
CREATE INDEX IF NOT EXISTS idx_referrals_city ON referrals(city);
