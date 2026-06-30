-- Roles y permisos de Finanzas para Chuturubises.
-- Ejecutar en Supabase SQL Editor.
--
-- Si public.user_roles.role usa el enum public.app_role, ejecuta primero:
-- alter type public.app_role add value if not exists 'treasurer';
-- Luego ejecuta el resto del archivo. Si role es texto, no hace falta ese paso.

delete from public.user_roles
where user_id in (
  'eed4d397-61f5-43f8-9f3e-70202a9158e6'::uuid,
  '796d0128-8cac-4c5f-b17b-2bd8bf4a05c2'::uuid
);

insert into public.user_roles (user_id, role)
values
  ('eed4d397-61f5-43f8-9f3e-70202a9158e6'::uuid, 'treasurer'),
  ('796d0128-8cac-4c5f-b17b-2bd8bf4a05c2'::uuid, 'admin');

drop policy if exists "finance managers can manage fees" on public.fees;
create policy "finance managers can manage fees"
on public.fees
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'treasurer')
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'treasurer')
  )
);

drop policy if exists "finance managers can manage payments" on public.fee_payments;
create policy "finance managers can manage payments"
on public.fee_payments
for all
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'treasurer')
  )
)
with check (
  profile_id = auth.uid()
  or exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'treasurer')
  )
);

drop policy if exists "finance managers can manage settings" on public.fraternity_settings;
create policy "finance managers can manage settings"
on public.fraternity_settings
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'treasurer')
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'treasurer')
  )
);

drop policy if exists "finance managers can upload fraternity qr" on storage.objects;
create policy "finance managers can upload fraternity qr"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and name like 'fraternity/%'
  and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'treasurer')
  )
);

drop policy if exists "finance managers can update fraternity qr" on storage.objects;
create policy "finance managers can update fraternity qr"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and name like 'fraternity/%'
  and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'treasurer')
  )
)
with check (
  bucket_id = 'avatars'
  and name like 'fraternity/%'
  and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'treasurer')
  )
);
