-- Admin date editing for photo album entries.
-- Safe to run multiple times.

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
