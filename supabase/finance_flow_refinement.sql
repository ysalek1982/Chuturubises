-- Refined finance workflow: per-charge QR, close/archive, refunds and notifications.
-- Safe to run more than once after finance_payment_entries.sql.

alter table public.fees
  add column if not exists payment_qr_url text,
  add column if not exists status text not null default 'open',
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by uuid;

alter table public.fees
  drop constraint if exists fees_status_check;

alter table public.fees
  add constraint fees_status_check
  check (status in ('open', 'closed', 'archived'));

update public.fees
set payment_qr_url = (
  select value
  from public.fraternity_settings
  where key = 'payment_qr_url'
  limit 1
)
where payment_qr_url is null
  and exists (
    select 1
    from public.fraternity_settings
    where key = 'payment_qr_url'
  );

alter table public.fee_payment_entries
  drop constraint if exists fee_payment_entries_payment_method_check;

alter table public.fee_payment_entries
  add constraint fee_payment_entries_payment_method_check
  check (payment_method in ('receipt', 'manual', 'refund'));

create or replace function public.finance_notify_profile(
  p_profile_id uuid,
  p_title text,
  p_body text,
  p_kind text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (profile_id, title, body, kind, read)
  values (p_profile_id, p_title, p_body, p_kind, false);
end;
$$;

revoke all on function public.finance_notify_profile(uuid, text, text, text) from public, anon, authenticated;

create or replace function public.finance_notify_managers(
  p_title text,
  p_body text,
  p_kind text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.notifications (profile_id, title, body, kind, read)
  select distinct ur.user_id, p_title, p_body, p_kind, false
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  where ur.role::text in ('admin', 'treasurer')
    and p.approval_status = 'approved';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.finance_notify_managers(text, text, text) from public, anon, authenticated;

create or replace function public.sync_fee_obligations(p_fee_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric(10,2);
  v_status text;
  v_count integer;
begin
  if not public.is_finance_manager(auth.uid()) then
    raise exception 'Only finance managers can sync fee obligations';
  end if;

  select amount, status
  into v_amount, v_status
  from public.fees
  where id = p_fee_id;

  if v_amount is null then
    raise exception 'Fee not found';
  end if;

  if v_status = 'archived' then
    raise exception 'Archived fees cannot be synced';
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

  select greatest(coalesce(sum(
    case
      when payment_method = 'refund' then -amount
      else amount
    end
  ), 0), 0)
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
  v_row public.fee_payments;
  v_fee public.fees;
  v_paid numeric(10,2);
  v_reviewing numeric(10,2);
  v_available numeric(10,2);
  v_name text;
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

  select * into v_fee
  from public.fees
  where id = p_fee_id;

  if v_fee.id is null then
    raise exception 'Fee not found';
  end if;

  if v_fee.status <> 'open' or v_fee.is_active is not true then
    raise exception 'This fee is not open for payments';
  end if;

  v_row := public.ensure_fee_payment_row(p_fee_id, v_profile_id);

  select
    greatest(coalesce(sum(case when status = 'paid' and payment_method = 'refund' then -amount when status = 'paid' then amount else 0 end), 0), 0),
    coalesce(sum(amount) filter (where status = 'reviewing'), 0)
  into v_paid, v_reviewing
  from public.fee_payment_entries
  where fee_id = p_fee_id
    and profile_id = v_profile_id;

  v_available := greatest(coalesce(v_row.amount_due, v_fee.amount) - coalesce(v_paid, 0) - coalesce(v_reviewing, 0), 0);

  if p_amount > v_available then
    raise exception 'Amount exceeds pending balance';
  end if;

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
  where id = v_row.id;

  perform public.recalculate_fee_payment(p_fee_id, v_profile_id);

  select coalesce(nullif(nickname, ''), full_name, 'Fraterno')
  into v_name
  from public.profiles
  where id = v_profile_id;

  perform public.finance_notify_managers(
    'Comprobante por revisar',
    '@' || v_name || ' subio Bs ' || to_char(p_amount, 'FM999999990.00') || ' para ' || v_fee.title || '.',
    'finance_receipt_submitted'
  );

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
  v_fee public.fees;
  v_row public.fee_payments;
  v_paid numeric(10,2);
  v_balance numeric(10,2);
begin
  if not public.is_finance_manager(auth.uid()) then
    raise exception 'Only finance managers can register payments';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select * into v_fee from public.fees where id = p_fee_id;
  if v_fee.id is null then
    raise exception 'Fee not found';
  end if;
  if v_fee.status <> 'open' then
    raise exception 'This fee is closed';
  end if;

  v_row := public.ensure_fee_payment_row(p_fee_id, p_profile_id);

  select greatest(coalesce(sum(case when payment_method = 'refund' then -amount else amount end), 0), 0)
  into v_paid
  from public.fee_payment_entries
  where fee_id = p_fee_id
    and profile_id = p_profile_id
    and status = 'paid';

  v_balance := greatest(coalesce(v_row.amount_due, v_fee.amount) - coalesce(v_paid, 0), 0);
  if p_amount > v_balance then
    raise exception 'Amount exceeds pending balance';
  end if;

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

  perform public.finance_notify_profile(
    p_profile_id,
    'Pago registrado',
    'Tesoreria registro Bs ' || to_char(p_amount, 'FM999999990.00') || ' para ' || v_fee.title || '.',
    'finance_payment_registered'
  );

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
  v_fee public.fees;
begin
  if not public.is_finance_manager(auth.uid()) then
    raise exception 'Only finance managers can approve payments';
  end if;

  select * into v_entry
  from public.fee_payment_entries
  where id = p_entry_id;

  if v_entry.id is null then
    raise exception 'Payment entry not found';
  end if;

  select * into v_fee
  from public.fees
  where id = v_entry.fee_id;

  update public.fee_payment_entries
  set
    status = 'paid',
    approved_by = auth.uid(),
    approved_at = now(),
    rejected_at = null
  where id = p_entry_id
  returning * into v_entry;

  perform public.recalculate_fee_payment(v_entry.fee_id, v_entry.profile_id);

  perform public.finance_notify_profile(
    v_entry.profile_id,
    'Pago aprobado',
    'Tu abono de Bs ' || to_char(v_entry.amount, 'FM999999990.00') || ' para ' || coalesce(v_fee.title, 'Finanzas') || ' fue aprobado.',
    'finance_payment_approved'
  );

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
  v_fee public.fees;
begin
  if not public.is_finance_manager(auth.uid()) then
    raise exception 'Only finance managers can reject payments';
  end if;

  select f.* into v_fee
  from public.fee_payment_entries e
  join public.fees f on f.id = e.fee_id
  where e.id = p_entry_id;

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

  perform public.finance_notify_profile(
    v_entry.profile_id,
    'Comprobante rechazado',
    'Tu comprobante de Bs ' || to_char(v_entry.amount, 'FM999999990.00') || ' para ' || coalesce(v_fee.title, 'Finanzas') || ' fue rechazado.',
    'finance_payment_rejected'
  );

  return v_entry;
end;
$$;

grant execute on function public.reject_fee_payment_entry(uuid) to authenticated;

create or replace function public.register_fee_refund(
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
  v_fee public.fees;
  v_paid numeric(10,2);
begin
  if not public.is_finance_manager(auth.uid()) then
    raise exception 'Only finance managers can register refunds';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select * into v_fee from public.fees where id = p_fee_id;
  if v_fee.id is null then
    raise exception 'Fee not found';
  end if;

  perform public.ensure_fee_payment_row(p_fee_id, p_profile_id);

  select greatest(coalesce(sum(case when payment_method = 'refund' then -amount else amount end), 0), 0)
  into v_paid
  from public.fee_payment_entries
  where fee_id = p_fee_id
    and profile_id = p_profile_id
    and status = 'paid';

  if p_amount > coalesce(v_paid, 0) then
    raise exception 'Refund exceeds paid amount';
  end if;

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
    'refund',
    p_notes,
    auth.uid(),
    auth.uid(),
    now()
  )
  returning * into v_entry;

  perform public.recalculate_fee_payment(p_fee_id, p_profile_id);

  perform public.finance_notify_profile(
    p_profile_id,
    'Devolucion registrada',
    'Tesoreria registro una devolucion de Bs ' || to_char(p_amount, 'FM999999990.00') || ' en ' || v_fee.title || '.',
    'finance_refund_registered'
  );

  return v_entry;
end;
$$;

grant execute on function public.register_fee_refund(uuid, uuid, numeric, text) to authenticated;

create or replace function public.update_fee_details(
  p_fee_id uuid,
  p_title text,
  p_amount numeric,
  p_due_date date default null,
  p_is_active boolean default true
)
returns public.fees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_fee public.fees;
  v_profile uuid;
begin
  if not public.is_finance_manager(auth.uid()) then
    raise exception 'Only finance managers can update fees';
  end if;

  if v_title = '' then
    raise exception 'Fee title is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  update public.fees
  set
    title = v_title,
    item_label = v_title,
    amount = p_amount,
    due_date = p_due_date,
    is_active = coalesce(p_is_active, is_active),
    status = case
      when status = 'archived' then status
      when coalesce(p_is_active, is_active) then 'open'
      else status
    end
  where id = p_fee_id
  returning * into v_fee;

  if v_fee.id is null then
    raise exception 'Fee not found';
  end if;

  update public.fee_payments
  set amount_due = p_amount
  where fee_id = p_fee_id;

  for v_profile in
    select profile_id
    from public.fee_payments
    where fee_id = p_fee_id
  loop
    perform public.recalculate_fee_payment(p_fee_id, v_profile);
  end loop;

  return v_fee;
end;
$$;

grant execute on function public.update_fee_details(uuid, text, numeric, date, boolean) to authenticated;

create or replace function public.update_fee_title(p_fee_id uuid, p_title text)
returns public.fees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fee public.fees;
begin
  select * into v_fee from public.fees where id = p_fee_id;
  return public.update_fee_details(p_fee_id, p_title, v_fee.amount, v_fee.due_date, v_fee.is_active);
end;
$$;

grant execute on function public.update_fee_title(uuid, text) to authenticated;

create or replace function public.update_fee_payment_qr(p_fee_id uuid, p_payment_qr_url text)
returns public.fees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fee public.fees;
begin
  if not public.is_finance_manager(auth.uid()) then
    raise exception 'Only finance managers can update QR';
  end if;

  update public.fees
  set payment_qr_url = nullif(trim(coalesce(p_payment_qr_url, '')), '')
  where id = p_fee_id
  returning * into v_fee;

  if v_fee.id is null then
    raise exception 'Fee not found';
  end if;

  return v_fee;
end;
$$;

grant execute on function public.update_fee_payment_qr(uuid, text) to authenticated;

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
  set
    is_active = p_is_active,
    status = case
      when status = 'archived' then status
      when p_is_active then 'open'
      else status
    end
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

create or replace function public.close_fee(p_fee_id uuid)
returns public.fees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fee public.fees;
begin
  if not public.is_finance_manager(auth.uid()) then
    raise exception 'Only finance managers can close fees';
  end if;

  update public.fees
  set
    status = 'closed',
    is_active = false,
    closed_at = now(),
    closed_by = auth.uid()
  where id = p_fee_id
  returning * into v_fee;

  if v_fee.id is null then
    raise exception 'Fee not found';
  end if;

  insert into public.notifications (profile_id, title, body, kind, read)
  select
    fp.profile_id,
    'Cobro cerrado',
    'Tesoreria cerro el cobro ' || v_fee.title || '.',
    'finance_fee_closed',
    false
  from public.fee_payments fp
  where fp.fee_id = p_fee_id;

  return v_fee;
end;
$$;

grant execute on function public.close_fee(uuid) to authenticated;

create or replace function public.reopen_fee(p_fee_id uuid)
returns public.fees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fee public.fees;
begin
  if not public.is_finance_manager(auth.uid()) then
    raise exception 'Only finance managers can reopen fees';
  end if;

  update public.fees
  set
    status = 'open',
    is_active = true,
    closed_at = null,
    closed_by = null
  where id = p_fee_id
  returning * into v_fee;

  if v_fee.id is null then
    raise exception 'Fee not found';
  end if;

  perform public.sync_fee_obligations(p_fee_id);
  return v_fee;
end;
$$;

grant execute on function public.reopen_fee(uuid) to authenticated;

create or replace function public.archive_or_delete_fee(p_fee_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_entries boolean;
begin
  if not public.is_finance_manager(auth.uid()) then
    raise exception 'Only finance managers can archive fees';
  end if;

  select exists (
    select 1
    from public.fee_payment_entries
    where fee_id = p_fee_id
  )
  into v_has_entries;

  if v_has_entries then
    update public.fees
    set status = 'archived', is_active = false
    where id = p_fee_id;
    return 'archived';
  end if;

  delete from public.fees
  where id = p_fee_id;

  return 'deleted';
end;
$$;

grant execute on function public.archive_or_delete_fee(uuid) to authenticated;

drop function if exists public.get_active_finance_ledger();

create function public.get_active_finance_ledger()
returns table (
  fee_id uuid,
  fee_title text,
  fee_amount numeric,
  fee_due_date date,
  fee_status text,
  payment_qr_url text,
  profile_id uuid,
  nickname text,
  full_name text,
  tshirt_size text,
  amount_due numeric,
  first_payment numeric,
  second_payment numeric,
  extra_paid numeric,
  refund_amount numeric,
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
    select id, title, amount, due_date, status, payment_qr_url
    from public.fees
    where is_active = true
      and status = 'open'
  ),
  base as (
    select
      f.id as fee_id,
      f.title as fee_title,
      f.amount as fee_amount,
      f.due_date as fee_due_date,
      f.status as fee_status,
      f.payment_qr_url,
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
  paid_payment_entries as (
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
      and e.payment_method <> 'refund'
  ),
  payment_rollup as (
    select
      fee_id,
      profile_id,
      coalesce(sum(amount), 0) as gross_paid,
      coalesce(sum(amount) filter (where rn = 1), 0) as first_payment,
      coalesce(sum(amount) filter (where rn = 2), 0) as second_payment,
      coalesce(sum(amount) filter (where rn > 2), 0) as extra_paid
    from paid_payment_entries
    group by fee_id, profile_id
  ),
  refund_rollup as (
    select
      fee_id,
      profile_id,
      coalesce(sum(amount), 0) as refund_amount
    from public.fee_payment_entries
    where status = 'paid'
      and payment_method = 'refund'
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
    b.fee_status,
    b.payment_qr_url,
    b.profile_id,
    b.nickname,
    b.full_name,
    b.tshirt_size,
    b.amount_due,
    coalesce(pr.first_payment, 0) as first_payment,
    coalesce(pr.second_payment, 0) as second_payment,
    coalesce(pr.extra_paid, 0) as extra_paid,
    coalesce(rr.refund_amount, 0) as refund_amount,
    greatest(coalesce(pr.gross_paid, 0) - coalesce(rr.refund_amount, 0), 0) as amount_paid,
    coalesce(rv.reviewing_amount, 0) as reviewing_amount,
    greatest(b.amount_due - greatest(coalesce(pr.gross_paid, 0) - coalesce(rr.refund_amount, 0), 0), 0) as balance,
    case
      when greatest(b.amount_due - greatest(coalesce(pr.gross_paid, 0) - coalesce(rr.refund_amount, 0), 0), 0) <= 0 then 'paid'
      when coalesce(rv.reviewing_amount, 0) > 0 then 'reviewing'
      else 'pending'
    end as payment_status
  from base b
  left join payment_rollup pr
    on pr.fee_id = b.fee_id
    and pr.profile_id = b.profile_id
  left join refund_rollup rr
    on rr.fee_id = b.fee_id
    and rr.profile_id = b.profile_id
  left join reviewing_rollup rv
    on rv.fee_id = b.fee_id
    and rv.profile_id = b.profile_id
  order by b.fee_title, b.full_name;
$$;

grant execute on function public.get_active_finance_ledger() to authenticated;
