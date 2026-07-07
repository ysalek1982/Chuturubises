-- Push-ready device subscriptions for browser Push API.
-- Apply this in Supabase SQL editor before enabling real background push delivery.

alter table public.notifications
add column if not exists push_sent_at timestamptz;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push subscriptions own read" on public.push_subscriptions;
create policy "push subscriptions own read"
on public.push_subscriptions
for select
using (auth.uid() = profile_id);

drop policy if exists "push subscriptions own insert" on public.push_subscriptions;
create policy "push subscriptions own insert"
on public.push_subscriptions
for insert
with check (auth.uid() = profile_id);

drop policy if exists "push subscriptions own update" on public.push_subscriptions;
create policy "push subscriptions own update"
on public.push_subscriptions
for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "push subscriptions own delete" on public.push_subscriptions;
create policy "push subscriptions own delete"
on public.push_subscriptions
for delete
using (auth.uid() = profile_id);

create or replace function public.queue_birthday_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
  today_bo date := (now() at time zone 'America/La_Paz')::date;
begin
  insert into public.notifications (profile_id, title, body, kind, read)
  select
    receiver.id,
    'Cumpleanos Chuturubi',
    'Hoy cumple @' || celebrant.nickname || '. Que no se pase el saludo.',
    'birthday',
    false
  from public.profiles receiver
  cross join public.profiles celebrant
  where receiver.approval_status = 'approved'
    and celebrant.approval_status = 'approved'
    and celebrant.birth_date is not null
    and to_char(celebrant.birth_date::date, 'MM-DD') = to_char(today_bo, 'MM-DD')
    and not exists (
      select 1
      from public.notifications n
      where n.profile_id = receiver.id
        and n.kind = 'birthday'
        and n.title = 'Cumpleanos Chuturubi'
        and n.body = 'Hoy cumple @' || celebrant.nickname || '. Que no se pase el saludo.'
        and (n.created_at at time zone 'America/La_Paz')::date = today_bo
    );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

comment on function public.queue_birthday_notifications() is
'Creates one in-app birthday notification per approved member for birthdays happening today in Bolivia time.';
