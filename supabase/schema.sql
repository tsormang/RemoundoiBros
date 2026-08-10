-- Remoundoi Bros Supabase schema
-- Run this in the Supabase SQL editor (or via CLI) before using cloud saves.

create table if not exists public.run_summaries (
  id bigint generated always as identity primary key,
  hero_id text not null,
  hero_name text not null,
  elapsed_seconds integer not null default 0,
  kills integer not null default 0,
  gold integer not null default 0,
  level integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.run_summaries
  add column if not exists gold integer not null default 0;

create table if not exists public.player_stats (
  hero_id text primary key,
  hero_name text not null,
  runs integer not null default 0,
  total_kills integer not null default 0,
  total_gold integer not null default 0,
  total_elapsed_seconds integer not null default 0,
  best_level integer not null default 0,
  best_kills integer not null default 0,
  best_gold integer not null default 0,
  best_elapsed_seconds integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.run_summaries enable row level security;
alter table public.player_stats enable row level security;

drop policy if exists "Allow anon read run_summaries" on public.run_summaries;
drop policy if exists "Allow anon insert run_summaries" on public.run_summaries;
drop policy if exists "Allow anon read player_stats" on public.player_stats;
drop policy if exists "Allow anon upsert player_stats" on public.player_stats;

create policy "Allow anon read run_summaries"
  on public.run_summaries
  for select
  to anon, authenticated
  using (true);

create policy "Allow anon insert run_summaries"
  on public.run_summaries
  for insert
  to anon, authenticated
  with check (true);

create policy "Allow anon read player_stats"
  on public.player_stats
  for select
  to anon, authenticated
  using (true);

create policy "Allow anon upsert player_stats"
  on public.player_stats
  for all
  to anon, authenticated
  using (true)
  with check (true);
