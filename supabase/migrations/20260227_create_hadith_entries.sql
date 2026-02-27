-- Ahadith remote publishing table
-- Supports mobile authoring + broadcast workflow

CREATE TABLE IF NOT EXISTS public.hadith_entries (
  id BIGINT GENERATED ALWAYS AS IDENTITY (START WITH 100001 INCREMENT BY 1) PRIMARY KEY,
  arabic_text TEXT NOT NULL,
  dari_translation TEXT NOT NULL,
  pashto_translation TEXT NOT NULL,
  source_book TEXT NOT NULL CHECK (source_book IN ('Bukhari', 'Muslim')),
  source_number TEXT NOT NULL,
  is_muttafaq BOOLEAN NOT NULL DEFAULT false,
  topics TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  special_days TEXT[] NULL,
  hijri_month SMALLINT NULL,
  hijri_day_start SMALLINT NULL,
  hijri_day_end SMALLINT NULL,
  weekday_only TEXT NULL CHECK (weekday_only IN ('friday')),
  daily_index INTEGER NOT NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ NULL,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  notification_sent_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hadith_entries_daily_index_chk CHECK (daily_index >= 1),
  CONSTRAINT hadith_entries_hijri_triplet_chk CHECK (
    (hijri_month IS NULL AND hijri_day_start IS NULL AND hijri_day_end IS NULL)
    OR
    (hijri_month IS NOT NULL AND hijri_day_start IS NOT NULL AND hijri_day_end IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_hadith_entries_published_published_at
  ON public.hadith_entries (published, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_hadith_entries_topics
  ON public.hadith_entries USING GIN (topics);

CREATE INDEX IF NOT EXISTS idx_hadith_entries_daily_index_id
  ON public.hadith_entries (daily_index, id);

-- Reuse global updated_at trigger function from initial schema.
DROP TRIGGER IF EXISTS update_hadith_entries_updated_at ON public.hadith_entries;
CREATE TRIGGER update_hadith_entries_updated_at
  BEFORE UPDATE ON public.hadith_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.hadith_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hadith_entries'
      AND policyname = 'Public can read published hadith entries'
  ) THEN
    CREATE POLICY "Public can read published hadith entries"
      ON public.hadith_entries
      FOR SELECT
      USING (published = true);
  END IF;
END $$;
