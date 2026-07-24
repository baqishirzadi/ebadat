-- Expand hadith source books + authenticity grade for curated corpus beyond Sahihayn.

ALTER TABLE public.hadith_entries
  DROP CONSTRAINT IF EXISTS hadith_entries_source_book_check;

ALTER TABLE public.hadith_entries
  ADD CONSTRAINT hadith_entries_source_book_check
  CHECK (
    source_book IN (
      'Bukhari',
      'Muslim',
      'Ahmad',
      'AbuDawud',
      'Tirmidhi',
      'Nasai',
      'IbnMajah'
    )
  );

ALTER TABLE public.hadith_entries
  ADD COLUMN IF NOT EXISTS authenticity_grade TEXT;

UPDATE public.hadith_entries
SET authenticity_grade = CASE
  WHEN is_muttafaq IS TRUE THEN 'sahih'
  WHEN source_book IN ('Bukhari', 'Muslim') THEN 'sahih'
  ELSE COALESCE(authenticity_grade, 'sahih')
END
WHERE authenticity_grade IS NULL;

ALTER TABLE public.hadith_entries
  ALTER COLUMN authenticity_grade SET DEFAULT 'sahih';

ALTER TABLE public.hadith_entries
  ALTER COLUMN authenticity_grade SET NOT NULL;

ALTER TABLE public.hadith_entries
  DROP CONSTRAINT IF EXISTS hadith_entries_authenticity_grade_check;

ALTER TABLE public.hadith_entries
  ADD CONSTRAINT hadith_entries_authenticity_grade_check
  CHECK (authenticity_grade IN ('sahih', 'hasan', 'daif'));
