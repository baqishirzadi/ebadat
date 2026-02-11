create table if not exists public.naats (
  id uuid primary key default gen_random_uuid(),
  title_fa text not null,
  title_ps text not null,
  reciter_name text not null,
  description text,
  audio_url text not null,
  duration_seconds integer,
  file_size_mb numeric,
  created_at timestamptz not null default now()
);

alter table public.naats enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'naats' AND policyname = 'naats_select_public'
  ) THEN
    CREATE POLICY "naats_select_public"
      ON public.naats
      FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'naats' AND policyname = 'naats_insert_public'
  ) THEN
    CREATE POLICY "naats_insert_public"
      ON public.naats
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'naats' AND policyname = 'naats_update_public'
  ) THEN
    CREATE POLICY "naats_update_public"
      ON public.naats
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'naats' AND policyname = 'naats_delete_public'
  ) THEN
    CREATE POLICY "naats_delete_public"
      ON public.naats
      FOR DELETE
      USING (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.naats TO anon, authenticated;
