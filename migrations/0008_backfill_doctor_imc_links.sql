-- Move legacy IMC data from linked roster rows into the canonical doctor profile.
-- Existing doctor values win; only empty doctor fields are filled.
UPDATE doctors
SET imc_guid = COALESCE(imc_guid, (SELECT r.imc_guid FROM class_roster r WHERE r.id = doctors.roster_id)),
    imc_profile_url = COALESCE(imc_profile_url, (SELECT r.imc_profile_url FROM class_roster r WHERE r.id = doctors.roster_id)),
    imc_photo_url = COALESCE(imc_photo_url, (SELECT r.imc_photo_url FROM class_roster r WHERE r.id = doctors.roster_id)),
    updated_at = datetime('now')
WHERE roster_id IS NOT NULL
  AND (imc_guid IS NULL OR imc_profile_url IS NULL OR imc_photo_url IS NULL);
