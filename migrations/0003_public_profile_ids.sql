ALTER TABLE doctors ADD COLUMN public_id TEXT;
UPDATE doctors
SET public_id = lower(substr(hex(randomblob(6)), 1, 12))
WHERE public_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_public_id ON doctors(public_id);
