-- Finance ledger upgrade for partial payments, receipts and treasurer approvals.
-- Safe to run more than once.

create or replace function public.is_finance_manager(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = uid
      and ur.role::text in ('admin', 'treasurer')
  );
$$;

grant execute on function public.is_finance_manager(uuid) to authenticated;

alter table public.fee_payments
  add column if not exists amount_due numeric(10,2),
  add column if not exists amount_paid numeric(10,2) not null default 0,
  add column if not exists receipt_amount numeric(10,2),
  add column if not exists review_note text,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid;

update public.fee_payments fp
set amount_due = f.amount
from public.fees f
where fp.fee_id = f.id
  and (fp.amount_due is null or fp.amount_due <= 0);

alter table public.fee_payments
  alter column amount_due set default 0;

alter table public.fee_payments enable row level security;

create table if not exists public.fee_payment_entries (
  id uuid primary key default gen_random_uuid(),
  fee_id uuid not null references public.fees(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  status text not null default 'reviewing' check (status in ('reviewing', 'paid', 'rejected')),
  payment_method text not null default 'receipt' check (payment_method in ('receipt', 'manual')),
  receipt_url text,
  notes text,
  submitted_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists fee_payment_entries_fee_profile_idx
on public.fee_payment_entries (fee_id, profile_id);

create index if not exists fee_payment_entries_status_idx
on public.fee_payment_entries (status, created_at);

alter table public.fee_payment_entries enable row level security;

insert into public.fee_payment_entries (
  fee_id,
  profile_id,
  amount,
  status,
  payment_method,
  receipt_url,
  submitted_by,
  approved_by,
  approved_at,
  created_at
)
select
  fp.fee_id,
  fp.profile_id,
  coalesce(nullif(fp.receipt_amount, 0), nullif(fp.amount_paid, 0), nullif(fp.amount_due, 0), f.amount),
  fp.status,
  case when fp.receipt_url is null then 'manual' else 'receipt' end,
  fp.receipt_url,
  fp.profile_id,
  fp.approved_by,
  coalesce(fp.approved_at, fp.paid_at),
  fp.created_at
from public.fee_payments fp
join public.fees f on f.id = fp.fee_id
where fp.status in ('paid', 'reviewing')
  and not exists (
    select 1
    from public.fee_payment_entries e
    where e.fee_id = fp.fee_id
      and e.profile_id = fp.profile_id
      and e.created_at = fp.created_at
  );

create or replace function public.ensure_fee_payment_row(p_fee_id uuid, p_profile_id uuid)
returns public.fee_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.fee_payments;
  v_amount numeric(10,2);
begin
  select amount into v_amount
  from public.fees
  where id = p_fee_id;

  if v_amount is null then
    raise exception 'Fee not found';
  end if;

  select *
  into v_row
  from public.fee_payments
  where fee_id = p_fee_id
    and profile_id = p_profile_id
  order by created_at desc
  limit 1;

  if v_row.id is null then
    insert into public.fee_payments (fee_id, profile_id, status, amount_due, amount_paid)
    values (p_fee_id, p_profile_id, 'pending', v_amount, 0)
    returning * into v_row;
  elsif v_row.amount_due is null or v_row.amount_due <= 0 then
    update public.fee_payments
    set amount_due = v_amount
    where id = v_row.id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke all on function public.ensure_fee_payment_row(uuid, uuid) from public, anon, authenticated;

create or replace function public.recalculate_fee_payment(p_fee_id uuid, p_profile_id uuid)
returns public.fee_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.fee_payments;
  v_due numeric(10,2);
  v_paid numeric(10,2);
  v_reviewing boolean;
  v_status text;
begin
  v_row := public.ensure_fee_payment_row(p_fee_id, p_profile_id);
  v_due := coalesce(nullif(v_row.amount_due, 0), 0);

  select coalesce(sum(amount), 0)
  into v_paid
  from public.fee_payment_entries
  where fee_id = p_fee_id
    and profile_id = p_profile_id
    and status = 'paid';

  select exists (
    select 1
    from public.fee_payment_entries
    where fee_id = p_fee_id
      and profile_id = p_profile_id
      and status = 'reviewing'
  )
  into v_reviewing;

  v_status := case
    when v_due > 0 and v_paid >= v_due then 'paid'
    when v_reviewing then 'reviewing'
    else 'pending'
  end;

  update public.fee_payments
  set
    amount_paid = v_paid,
    status = v_status,
    paid_at = case when v_status = 'paid' then coalesce(paid_at, now()) else null end,
    receipt_url = case when v_reviewing then receipt_url else null end,
    receipt_amount = case when v_reviewing then receipt_amount else null end
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.recalculate_fee_payment(uuid, uuid) from public, anon, authenticated;

create or replace function public.submit_fee_payment_receipt(
  p_fee_id uuid,
  p_amount numeric,
  p_receipt_url text
)
returns public.fee_payment_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.fee_payment_entries;
  v_profile_id uuid := auth.uid();
begin
  if v_profile_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  if p_receipt_url is null or length(trim(p_receipt_url)) = 0 then
    raise exception 'Receipt is required';
  end if;

  perform public.ensure_fee_payment_row(p_fee_id, v_profile_id);

  insert into public.fee_payment_entries (
    fee_id,
    profile_id,
    amount,
    status,
    payment_method,
    receipt_url,
    submitted_by
  )
  values (
    p_fee_id,
    v_profile_id,
    p_amount,
    'reviewing',
    'receipt',
    p_receipt_url,
    v_profile_id
  )
  returning * into v_entry;

  update public.fee_payments
  set
    status = 'reviewing',
    receipt_url = p_receipt_url,
    receipt_amount = p_amount
  where id = (
    select id
    from public.fee_payments
    where fee_id = p_fee_id
      and profile_id = v_profile_id
    order by created_at desc
    limit 1
  );

  perform public.recalculate_fee_payment(p_fee_id, v_profile_id);
  return v_entry;
end;
$$;

grant execute on function public.submit_fee_payment_receipt(uuid, numeric, text) to authenticated;

create or replace function public.register_fee_payment_manual(
  p_fee_id uuid,
  p_profile_id uuid,
  p_amount numeric,
  p_notes text default null
)
returns public.fee_payment_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.fee_payment_entries;
begin
  if not public.is_finance_manager(auth.uid()) then
    raise exception 'Only finance managers can register payments';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  perform public.ensure_fee_payment_row(p_fee_id, p_profile_id);

  insert into public.fee_payment_entries (
    fee_id,
    profile_id,
    amount,
    status,
    payment_method,
    notes,
    submitted_by,
    approved_by,
    approved_at
  )
  values (
    p_fee_id,
    p_profile_id,
    p_amount,
    'paid',
    'manual',
    p_notes,
    auth.uid(),
    auth.uid(),
    now()
  )
  returning * into v_entry;

  perform public.recalculate_fee_payment(p_fee_id, p_profile_id);
  return v_entry;
end;
$$;

grant execute on function public.register_fee_payment_manual(uuid, uuid, numeric, text) to authenticated;

create or replace function public.approve_fee_payment_entry(p_entry_id uuid)
returns public.fee_payment_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.fee_payment_entries;
begin
  if not public.is_finance_manager(auth.uid()) then
    raise exception 'Only finance managers can approve payments';
  end if;

  update public.fee_payment_entries
  set
    status = 'paid',
    approved_by = auth.uid(),
    approved_at = now(),
    rejected_at = null
  where id = p_entry_id
  returning * into v_entry;

  if v_entry.id is null then
    raise exception 'Payment entry not found';
  end if;

  perform public.recalculate_fee_payment(v_entry.fee_id, v_entry.profile_id);
  return v_entry;
end;
$$;

grant execute on function public.approve_fee_payment_entry(uuid) to authenticated;

create or replace function public.reject_fee_payment_entry(p_entry_id uuid)
returns public.fee_payment_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.fee_payment_entries;
begin
  if not public.is_finance_manager(auth.uid()) then
    raise exception 'Only finance managers can reject payments';
  end if;

  update public.fee_payment_entries
  set
    status = 'rejected',
    rejected_at = now(),
    approved_by = null,
    approved_at = null
  where id = p_entry_id
  returning * into v_entry;

  if v_entry.id is null then
    raise exception 'Payment entry not found';
  end if;

  perform public.recalculate_fee_payment(v_entry.fee_id, v_entry.profile_id);
  return v_entry;
end;
$$;

grant execute on function public.reject_fee_payment_entry(uuid) to authenticated;

drop policy if exists "finance managers can manage payments" on public.fee_payments;
drop policy if exists "fee payments read own or finance" on public.fee_payments;
drop policy if exists "finance managers can write payments" on public.fee_payments;

create policy "fee payments read own or finance"
on public.fee_payments
for select
to authenticated
using (
  profile_id = auth.uid()
  or public.is_finance_manager(auth.uid())
);

create policy "finance managers can write payments"
on public.fee_payments
for all
to authenticated
using (public.is_finance_manager(auth.uid()))
with check (public.is_finance_manager(auth.uid()));

drop policy if exists "fee entries read own or finance" on public.fee_payment_entries;
drop policy if exists "finance managers can write fee entries" on public.fee_payment_entries;

create policy "fee entries read own or finance"
on public.fee_payment_entries
for select
to authenticated
using (
  profile_id = auth.uid()
  or public.is_finance_manager(auth.uid())
);

create policy "finance managers can write fee entries"
on public.fee_payment_entries
for all
to authenticated
using (public.is_finance_manager(auth.uid()))
with check (public.is_finance_manager(auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members upload own receipt files" on storage.objects;
drop policy if exists "members read own receipt files" on storage.objects;
drop policy if exists "finance managers read receipt files" on storage.objects;
drop policy if exists "finance managers delete receipt files" on storage.objects;

create policy "members upload own receipt files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "members read own receipt files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "finance managers read receipt files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'receipts'
  and public.is_finance_manager(auth.uid())
);

create policy "finance managers delete receipt files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'receipts'
  and public.is_finance_manager(auth.uid())
);
