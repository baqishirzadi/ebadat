-- Add ai_response and is_manual columns to dua_requests table
-- These columns are used by the dua-autonomous function to track AI-generated responses

ALTER TABLE IF EXISTS dua_requests
ADD COLUMN IF NOT EXISTS ai_response TEXT,
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN dua_requests.ai_response IS 'AI-generated response from dua-autonomous function';
COMMENT ON COLUMN dua_requests.is_manual IS 'Whether the response was manually written (true) or AI-generated (false)';
