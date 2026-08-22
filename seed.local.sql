-- Local-only development data. Safe to run repeatedly.
-- Iranian numbers are stored in normalized international form.

INSERT OR IGNORE INTO preapproved_phones (phone, note)
VALUES
  ('989356471349', 'ادمین محلی'),
  ('989902803693', 'پزشک محلی');

INSERT OR IGNORE INTO doctors
  (id, phone, full_name, specialty_main, city, role, status)
VALUES
  ('local-admin-09356471349', '989356471349', 'ادمین محلی', 'مدیریت سامانه', 'تهران', 'admin', 'approved'),
  ('local-doctor-09902803693', '989902803693', 'پزشک آزمایشی', 'پزشک عمومی', 'تهران', 'member', 'approved');

UPDATE doctors
SET role = 'admin', status = 'approved', updated_at = datetime('now')
WHERE phone = '989356471349';

UPDATE doctors
SET role = 'member', status = 'approved', updated_at = datetime('now')
WHERE phone = '989902803693';
