-- Optional English rendering for published hadith entries.
-- Empty string is allowed so older rows stay readable until English is filled in.

ALTER TABLE public.hadith_entries
  ADD COLUMN IF NOT EXISTS english_translation TEXT NOT NULL DEFAULT '';
