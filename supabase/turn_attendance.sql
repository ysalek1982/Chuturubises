-- Attendance pulse for fraternity turns.
create table if not exists public.turn_attendance (
  id uuid primary key default gen_random_uuid(),
  turn_id uuid not null references public.turn_groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('going', 'maybe', 'not_going')),
  updated_at timestamptz not null default now(),
  unique (turn_id, profile_id)
);

create index if not exists turn_attendance_turn_id_idx
  on public.turn_attendance (turn_id);

alter table public.turn_attendance enable row level security;

drop policy if exists "members read turn attendance" on public.turn_attendance;
create policy "members read turn attendance"
  on public.turn_attendance
  for select
  to authenticated
  using (true);

drop policy if exists "members add own turn attendance" on public.turn_attendance;
create policy "members add own turn attendance"
  on public.turn_attendance
  for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.turn_groups
      where turn_groups.id = turn_attendance.turn_id
        and turn_groups.archived = false
        and turn_groups.turn_date >= (now() at time zone 'America/La_Paz')::date
    )
  );

drop policy if exists "members update own turn attendance" on public.turn_attendance;
create policy "members update own turn attendance"
  on public.turn_attendance
  for update
  to authenticated
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.turn_groups
      where turn_groups.id = turn_attendance.turn_id
        and turn_groups.archived = false
        and turn_groups.turn_date >= (now() at time zone 'America/La_Paz')::date
    )
  );

drop policy if exists "members delete own turn attendance" on public.turn_attendance;
create policy "members delete own turn attendance"
  on public.turn_attendance
  for delete
  to authenticated
  using (profile_id = auth.uid());

grant select, insert, update, delete on public.turn_attendance to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'turn_attendance'
  ) then
    alter publication supabase_realtime add table public.turn_attendance;
  end if;
end
$$;
