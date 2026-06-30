-- Ejecutar en Supabase SQL Editor si un usuario queda en Auth pero no aparece en profiles.
-- Permite que cada fraterno cree/edite su propia ficha y repara usuarios ya creados en Auth.

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    nickname,
    avatar_url,
    approval_status,
    approved_at,
    approved_by
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), new.email, 'Fraterno'),
    coalesce(nullif(new.raw_user_meta_data->>'nickname', ''), split_part(coalesce(new.email, 'fraterno'), '@', 1)),
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    'approved',
    now(),
    new.id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- Repara cuentas ya existentes en Auth que quedaron sin fila en profiles.
insert into public.profiles (
  id,
  full_name,
  nickname,
  avatar_url,
  approval_status,
  approved_at,
  approved_by
)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), u.email, 'Fraterno'),
  coalesce(nullif(u.raw_user_meta_data->>'nickname', ''), split_part(coalesce(u.email, 'fraterno'), '@', 1)),
  nullif(u.raw_user_meta_data->>'avatar_url', ''),
  'approved',
  now(),
  u.id
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
