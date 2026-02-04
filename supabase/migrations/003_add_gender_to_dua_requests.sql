-- Add gender column to dua_requests
ALTER TABLE IF EXISTS dua_requests
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'unspecified'
CHECK (gender IN ('male', 'female', 'unspecified'));
