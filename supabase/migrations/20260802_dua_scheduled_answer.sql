-- Schedule auto-answers for دعای خیر (human-like delay)
ALTER TABLE IF EXISTS dua_requests
  ADD COLUMN IF NOT EXISTS scheduled_answer_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dua_requests_scheduled_answer
  ON dua_requests (scheduled_answer_at)
  WHERE status = 'pending' AND scheduled_answer_at IS NOT NULL;

COMMENT ON COLUMN dua_requests.scheduled_answer_at IS 'When the autonomous Sayed reply may be published (random 10–60 min after submit)';
