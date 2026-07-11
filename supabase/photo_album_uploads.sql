-- Photo album table, storage bucket and policies.
-- Safe to run multiple times.

create table if not exists public.photo_album (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now()
);

alter table public.photo_album enable row level security;

drop policy if exists "photo album visible to members" on public.photo_album;
create policy "photo album visible to members"
on public.photo_album
for select
to authenticated
using (true);

drop policy if exists "members can add own album photos" on public.photo_album;
create policy "members can add own album photos"
on public.photo_album
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approval_status <> 'rejected'
  )
);

drop policy if exists "members can update own album captions" on public.photo_album;
drop policy if exists "admins can update album metadata" on public.photo_album;
create policy "admins can update album metadata"
on public.photo_album
for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role::text = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role::text = 'admin'
  )
);

create or replace function public.update_album_photo_date(
  p_photo_id uuid,
  p_created_at timestamptz
)
returns public.photo_album
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.photo_album;
begin
  if not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role::text = 'admin'
  ) then
    raise exception 'Solo administradores pueden editar la fecha del album'
      using errcode = '42501';
  end if;

  if p_created_at is null then
    raise exception 'La fecha es obligatoria'
      using errcode = '22004';
  end if;

  update public.photo_album
  set created_at = p_created_at
  where id = p_photo_id
  returning * into v_row;

  if not found then
    raise exception 'Foto no encontrada'
      using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

revoke all on function public.update_album_photo_date(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.update_album_photo_date(uuid, timestamptz) to authenticated;

drop policy if exists "members and admins can delete album photos" on public.photo_album;
create policy "members and admins can delete album photos"
on public.photo_album
for delete
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role::text = 'admin'
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'album_photos',
  'album_photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members upload own album photos" on storage.objects;
create policy "members upload own album photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'album_photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approval_status <> 'rejected'
  )
);

drop policy if exists "members read album photos" on storage.objects;
create policy "members read album photos"
on storage.objects
for select
to authenticated
using (bucket_id = 'album_photos');

drop policy if exists "members delete own album photos" on storage.objects;
create policy "members delete own album photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'album_photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role::text = 'admin'
    )
  )
);
