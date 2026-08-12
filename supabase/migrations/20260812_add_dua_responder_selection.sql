-- Explicit responder selection for new Dua requests.
ALTER TABLE IF EXISTS dua_requests
  ADD COLUMN IF NOT EXISTS responder_id TEXT,
  ADD COLUMN IF NOT EXISTS responder_name TEXT;

COMMENT ON COLUMN dua_requests.responder_id IS 'Selected responder registry id; required for new client submissions.';
COMMENT ON COLUMN dua_requests.responder_name IS 'Display name captured with the selected responder for stable history.';
