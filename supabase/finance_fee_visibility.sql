-- Active finance charges and default Camisas Chutus obligation.
-- Safe to run more than once.

alter table public.fees
  add column if not exists is_active boolean not null default true,
  add column if not exists item_label text;

alter table public.fees enable row level security;

update public.fees
set item_label = title
where item_label is null;

drop policy if exists "fees read active or finance" on public.fees;
create policy "fees read active or finance"
on public.fees
for select
to authenticated
using (
  is_active = true
  or public.is_finance_manager(auth.uid())
);

create or replace function public.sync_fee_obligations(p_fee_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric(10,2);
  v_count integer;
begin
  if not public.is_finance_manager(auth.uid()) then
    raise exception 'Only finance managers can sync fee obligations';
  end if;

  select amount
  into v_amount
  from public.fees
  where id = p_fee_id;

  if v_amount is null then
    raise exception 'Fee not found';
  end if;

  insert into public.fee_payments (fee_id, profile_id, status, amount_due, amount_paid)
  select
    p_fee_id,
    p.id,
    'pending',
    v_amount,
    0
  from public.profiles p
  where p.approval_status <> 'rejected'
    and not exists (
      select 1
      from public.fee_payments fp
      where fp.fee_id = p_fee_id
        and fp.profile_id = p.id
    );

  get diagnostics v_count = row_count;

  update public.fee_payments
  set amount_due = v_amount
  where fee_id = p_fee_id
    and (amount_due is null or amount_due <= 0);

  return v_count;
end;
$$;

grant execute on function public.sync_fee_obligations(uuid) to authenticated;

create or replace function public.set_fee_active(p_fee_id uuid, p_is_active boolean)
returns public.fees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fee public.fees;
begin
  if not public.is_finance_manager(auth.uid()) then
    raise exception 'Only finance managers can change fee visibility';
  end if;

  update public.fees
  set is_active = p_is_active
  where id = p_fee_id
  returning * into v_fee;

  if v_fee.id is null then
    raise exception 'Fee not found';
  end if;

  if p_is_active then
    perform public.sync_fee_obligations(p_fee_id);
  end if;

  return v_fee;
end;
$$;

grant execute on function public.set_fee_active(uuid, boolean) to authenticated;

create or replace function public.get_active_finance_ledger()
returns table (
  fee_id uuid,
  fee_title text,
  fee_amount numeric,
  fee_due_date date,
  profile_id uuid,
  nickname text,
  full_name text,
  tshirt_size text,
  amount_due numeric,
  first_payment numeric,
  second_payment numeric,
  extra_paid numeric,
  amount_paid numeric,
  reviewing_amount numeric,
  balance numeric,
  payment_status text
)
language sql
stable
security definer
set search_path = public
as $$
  with active_fees as (
    select id, title, amount, due_date
    from public.fees
    where is_active = true
  ),
  base as (
    select
      f.id as fee_id,
      f.title as fee_title,
      f.amount as fee_amount,
      f.due_date as fee_due_date,
      p.id as profile_id,
      p.nickname,
      p.full_name,
      p.tshirt_size,
      coalesce(nullif(fp.amount_due, 0), f.amount) as amount_due,
      fp.status as payment_status
    from active_fees f
    cross join public.profiles p
    left join public.fee_payments fp
      on fp.fee_id = f.id
      and fp.profile_id = p.id
    where p.approval_status <> 'rejected'
  ),
  paid_entries as (
    select
      e.fee_id,
      e.profile_id,
      e.amount,
      row_number() over (
        partition by e.fee_id, e.profile_id
        order by coalesce(e.approved_at, e.created_at), e.id
      ) as rn
    from public.fee_payment_entries e
    where e.status = 'paid'
  ),
  paid_rollup as (
    select
      fee_id,
      profile_id,
      coalesce(sum(amount), 0) as amount_paid,
      coalesce(sum(amount) filter (where rn = 1), 0) as first_payment,
      coalesce(sum(amount) filter (where rn = 2), 0) as second_payment,
      coalesce(sum(amount) filter (where rn > 2), 0) as extra_paid
    from paid_entries
    group by fee_id, profile_id
  ),
  reviewing_rollup as (
    select
      fee_id,
      profile_id,
      coalesce(sum(amount), 0) as reviewing_amount
    from public.fee_payment_entries
    where status = 'reviewing'
    group by fee_id, profile_id
  )
  select
    b.fee_id,
    b.fee_title,
    b.fee_amount,
    b.fee_due_date,
    b.profile_id,
    b.nickname,
    b.full_name,
    b.tshirt_size,
    b.amount_due,
    coalesce(pr.first_payment, 0) as first_payment,
    coalesce(pr.second_payment, 0) as second_payment,
    coalesce(pr.extra_paid, 0) as extra_paid,
    coalesce(pr.amount_paid, 0) as amount_paid,
    coalesce(rr.reviewing_amount, 0) as reviewing_amount,
    greatest(b.amount_due - coalesce(pr.amount_paid, 0), 0) as balance,
    case
      when greatest(b.amount_due - coalesce(pr.amount_paid, 0), 0) <= 0 then 'paid'
      when coalesce(rr.reviewing_amount, 0) > 0 then 'reviewing'
      else 'pending'
    end as payment_status
  from base b
  left join paid_rollup pr
    on pr.fee_id = b.fee_id
    and pr.profile_id = b.profile_id
  left join reviewing_rollup rr
    on rr.fee_id = b.fee_id
    and rr.profile_id = b.profile_id
  order by b.fee_title, b.full_name;
$$;

grant execute on function public.get_active_finance_ledger() to authenticated;

with camisas_fee as (
  insert into public.fees (title, item_label, amount, due_date, is_active)
  select 'Camisas Chutus', 'Camisas Chutus', 200, null, true
  where not exists (
    select 1
    from public.fees
  )
  returning id, amount
),
selected_fee as (
  select id, amount from camisas_fee
  union all
  select id, amount
  from public.fees
  where lower(title) in (lower('Camisas Chutus'), lower('Poleras Chutus 2026'))
  limit 1
)
update public.fees
set
  amount = 200,
  item_label = coalesce(item_label, title),
  is_active = true
where id in (select id from selected_fee);

with selected_fee as (
  select id, amount
  from public.fees
  where lower(title) in (lower('Camisas Chutus'), lower('Poleras Chutus 2026'))
  limit 1
)
insert into public.fee_payments (fee_id, profile_id, status, amount_due, amount_paid)
select
  sf.id,
  p.id,
  'pending',
  sf.amount,
  0
from selected_fee sf
cross join public.profiles p
where p.approval_status <> 'rejected'
  and not exists (
    select 1
    from public.fee_payments fp
    where fp.fee_id = sf.id
      and fp.profile_id = p.id
  );
