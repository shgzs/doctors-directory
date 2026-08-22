-- Class roster imported from the university list. It is a reference directory
-- until a person is linked to a logged-in doctor profile.
CREATE TABLE IF NOT EXISTS class_roster (
  id TEXT PRIMARY KEY,
  official_name TEXT NOT NULL,
  council_number TEXT,
  degree TEXT,
  field TEXT,
  graduation_year TEXT,
  source_status TEXT,
  source_ref TEXT,
  phone TEXT UNIQUE,
  doctor_id TEXT UNIQUE REFERENCES doctors(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_class_roster_name ON class_roster(official_name);
CREATE INDEX IF NOT EXISTS idx_class_roster_council ON class_roster(council_number);

ALTER TABLE doctors ADD COLUMN official_name TEXT;
ALTER TABLE doctors ADD COLUMN roster_id TEXT REFERENCES class_roster(id) ON DELETE SET NULL;
UPDATE doctors SET official_name = full_name WHERE official_name IS NULL;
CREATE INDEX IF NOT EXISTS idx_doctors_roster ON doctors(roster_id);

-- A question stays in the directory after it receives answers.
CREATE TABLE IF NOT EXISTS recommendation_requests (
  id TEXT PRIMARY KEY,
  asked_by_doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  specialty TEXT,
  city TEXT,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open | answered | closed
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_recommendation_requests_status ON recommendation_requests(status);
CREATE INDEX IF NOT EXISTS idx_recommendation_requests_created ON recommendation_requests(created_at);

CREATE TABLE IF NOT EXISTS recommendation_answers (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES recommendation_requests(id) ON DELETE CASCADE,
  answered_by_doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  recommended_name TEXT NOT NULL,
  recommended_doctor_id TEXT REFERENCES doctors(id) ON DELETE SET NULL,
  specialty TEXT,
  city TEXT,
  phone TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_recommendation_answers_request ON recommendation_answers(request_id);
