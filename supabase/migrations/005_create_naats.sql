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

-- Read-only for anon (catalog access)
create policy if not exists "naats_select_public"
  on public.naats
  for select
  using (true);

create policy if not exists "naats_insert_public"
  on public.naats
  for insert
  with check (true);

create policy if not exists "naats_update_public"
  on public.naats
  for update
  using (true)
  with check (true);

create policy if not exists "naats_delete_public"
  on public.naats
  for delete
  using (true);
