-- Normalize legacy Arabic yeh/kaf in stored names. Keep ئ intact for display;
-- the application search form treats it as equivalent to ی.
UPDATE doctors SET
  full_name = REPLACE(REPLACE(full_name, 'ي', 'ی'), 'ك', 'ک'),
  official_name = REPLACE(REPLACE(official_name, 'ي', 'ی'), 'ك', 'ک');

UPDATE class_roster SET
  official_name = REPLACE(REPLACE(official_name, 'ي', 'ی'), 'ك', 'ک'),
  degree = REPLACE(REPLACE(degree, 'ي', 'ی'), 'ك', 'ک'),
  field = REPLACE(REPLACE(field, 'ي', 'ی'), 'ك', 'ک');
