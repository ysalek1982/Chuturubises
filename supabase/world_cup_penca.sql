-- Penca Mundialista Chuturubises.
-- Ejecutar en Supabase SQL Editor.

create table if not exists public.world_cup_matches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  stage text not null default 'Cuartos de final',
  home_team text not null,
  away_team text not null,
  venue text,
  kickoff_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'final')),
  home_score integer check (home_score >= 0),
  away_score integer check (away_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.world_cup_predictions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.world_cup_matches(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  home_score integer not null check (home_score >= 0),
  away_score integer not null check (away_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, profile_id)
);

create table if not exists public.fraternity_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.world_cup_matches enable row level security;
alter table public.world_cup_predictions enable row level security;
alter table public.fraternity_settings enable row level security;

drop policy if exists "members can read world cup matches" on public.world_cup_matches;
create policy "members can read world cup matches"
on public.world_cup_matches
for select
to authenticated
using (true);

drop policy if exists "admins can manage world cup matches" on public.world_cup_matches;
create policy "admins can manage world cup matches"
on public.world_cup_matches
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
  or auth.uid() = '796d0128-8cac-4c5f-b17b-2bd8bf4a05c2'::uuid
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
  or auth.uid() = '796d0128-8cac-4c5f-b17b-2bd8bf4a05c2'::uuid
);

drop policy if exists "members can read world cup predictions" on public.world_cup_predictions;
create policy "members can read world cup predictions"
on public.world_cup_predictions
for select
to authenticated
using (true);

drop policy if exists "members can upsert own world cup predictions" on public.world_cup_predictions;
create policy "members can upsert own world cup predictions"
on public.world_cup_predictions
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.world_cup_matches m
    where m.id = match_id
      and m.kickoff_at > now()
      and m.status = 'scheduled'
  )
);

drop policy if exists "members can update own world cup predictions" on public.world_cup_predictions;
create policy "members can update own world cup predictions"
on public.world_cup_predictions
for update
to authenticated
using (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.world_cup_matches m
    where m.id = match_id
      and m.kickoff_at > now()
      and m.status = 'scheduled'
  )
)
with check (profile_id = auth.uid());

drop policy if exists "admins can manage world cup gemini settings" on public.fraternity_settings;
create policy "admins can manage world cup gemini settings"
on public.fraternity_settings
for all
to authenticated
using (
  key = 'gemini_api_key'
  and (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'
    )
    or auth.uid() = '796d0128-8cac-4c5f-b17b-2bd8bf4a05c2'::uuid
  )
)
with check (
  key = 'gemini_api_key'
  and (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'
    )
    or auth.uid() = '796d0128-8cac-4c5f-b17b-2bd8bf4a05c2'::uuid
  )
);

update public.world_cup_matches
set code = 'Match 97'
where code = 'QF1'
  and not exists (select 1 from public.world_cup_matches where code = 'Match 97');

update public.world_cup_matches
set code = 'Match 98'
where code = 'QF2'
  and not exists (select 1 from public.world_cup_matches where code = 'Match 98');

update public.world_cup_matches
set code = 'Match 99'
where code = 'QF3'
  and not exists (select 1 from public.world_cup_matches where code = 'Match 99');

update public.world_cup_matches
set code = 'Match 100'
where code = 'QF4'
  and not exists (select 1 from public.world_cup_matches where code = 'Match 100');

insert into public.world_cup_matches (code, stage, home_team, away_team, venue, kickoff_at)
values
  ('Match 97', 'Cuartos de final', 'Ganador partido 89', 'Ganador partido 90', 'Boston Stadium', '2026-07-09 16:00:00-04'),
  ('Match 98', 'Cuartos de final', 'Ganador partido 93', 'Ganador partido 94', 'Los Angeles Stadium', '2026-07-10 15:00:00-07'),
  ('Match 99', 'Cuartos de final', 'Ganador partido 91', 'Ganador partido 92', 'Miami Stadium', '2026-07-11 17:00:00-04'),
  ('Match 100', 'Cuartos de final', 'Ganador partido 95', 'Ganador partido 96', 'Kansas City Stadium', '2026-07-11 20:00:00-05')
on conflict (code) do update
set
  stage = excluded.stage,
  home_team = excluded.home_team,
  away_team = excluded.away_team,
  venue = excluded.venue,
  kickoff_at = excluded.kickoff_at,
  updated_at = now();
