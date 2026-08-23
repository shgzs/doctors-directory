ALTER TABLE class_roster ADD COLUMN student_number TEXT;
ALTER TABLE class_roster ADD COLUMN imc_guid TEXT;
ALTER TABLE class_roster ADD COLUMN imc_profile_url TEXT;
ALTER TABLE class_roster ADD COLUMN imc_photo_url TEXT;

-- The imported 7410... values are university student numbers, not medical
-- council numbers. Preserve them in their own field and leave genuine
-- council numbers available for later enrichment.
UPDATE class_roster
SET student_number = council_number,
    council_number = NULL
WHERE council_number LIKE '7410%';

CREATE INDEX IF NOT EXISTS idx_class_roster_student_number ON class_roster(student_number);
CREATE INDEX IF NOT EXISTS idx_class_roster_imc_guid ON class_roster(imc_guid);
