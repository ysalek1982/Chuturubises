-- Initial Poleras Chutus 2026 data from the treasurer spreadsheet.
-- Matches by nickname or full name aliases and is safe to run more than once.

with sheet_rows(label, aliases, tshirt_size, first_payment) as (
  values
    ('Carlao', array['carlao', 'carlos andres salvatiierra', 'carlos andres salvatierra', 'carlos'], '3XL', 100::numeric),
    ('Olvis', array['olvis'], 'M', 100::numeric),
    ('Percy', array['percy'], 'XXL', 0::numeric),
    ('Bryan', array['bryan', 'el negro'], '3XL', 100::numeric),
    ('Gato', array['gato', 'hugos christian'], 'XL', 100::numeric),
    ('Hugo', array['hugo', 'hugo sandoval'], '3XL', 100::numeric),
    ('Gary', array['gary', 'edson gary', 'hinojosa'], '2XL', 100::numeric),
    ('Yassir', array['yassir', 'ysalek', 'ysalek@gmail.com'], 'L', 200::numeric),
    ('Colo', array['colo', 'colodro'], 'XL', 0::numeric),
    ('Javier', array['javier', 'castillo'], '2XL', 0::numeric),
    ('Leche', array['leche', 'oscar', 'ortiz'], 'XL', 0::numeric),
    ('Torqui', array['torqui', 'torky', 'jorge ricardo'], '6XL', 0::numeric),
    ('J pablo', array['j pablo', 'jpablo', 'juan pablo', 'majau'], 'XL', 0::numeric),
    ('Mario', array['mario'], 'M', 0::numeric),
    ('Jhon', array['jhon', 'john', 'jhon parada', 'jr parada'], 'L', 0::numeric)
),
matched_profiles as (
  select distinct on (sr.label)
    sr.label,
    sr.tshirt_size,
    sr.first_payment,
    p.id as profile_id
  from sheet_rows sr
  join lateral (
    select p.*
    from public.profiles p
    where exists (
      select 1
      from unnest(sr.aliases) alias
      where lower(trim(coalesce(p.nickname, ''))) = lower(alias)
        or lower(trim(coalesce(p.full_name, ''))) = lower(alias)
        or lower(coalesce(p.full_name, '')) like '%' || lower(alias) || '%'
        or lower(coalesce(p.nickname, '')) like '%' || lower(alias) || '%'
    )
    order by
      case
        when lower(trim(coalesce(p.nickname, ''))) = lower(sr.label) then 0
        when lower(trim(coalesce(p.nickname, ''))) = any(sr.aliases) then 1
        else 2
      end,
      p.created_at
    limit 1
  ) p on true
  order by sr.label
),
polera_fee as (
  select id
  from public.fees
  where lower(title) = lower('Poleras Chutus 2026')
  limit 1
)
update public.profiles p
set tshirt_size = mp.tshirt_size
from matched_profiles mp
where p.id = mp.profile_id
  and mp.tshirt_size is not null;

with sheet_rows(label, aliases, tshirt_size, first_payment) as (
  values
    ('Carlao', array['carlao', 'carlos andres salvatiierra', 'carlos andres salvatierra', 'carlos'], '3XL', 100::numeric),
    ('Olvis', array['olvis'], 'M', 100::numeric),
    ('Bryan', array['bryan', 'el negro'], '3XL', 100::numeric),
    ('Gato', array['gato', 'hugos christian'], 'XL', 100::numeric),
    ('Hugo', array['hugo', 'hugo sandoval'], '3XL', 100::numeric),
    ('Gary', array['gary', 'edson gary', 'hinojosa'], '2XL', 100::numeric),
    ('Yassir', array['yassir', 'ysalek', 'ysalek@gmail.com'], 'L', 200::numeric)
),
matched_profiles as (
  select distinct on (sr.label)
    sr.label,
    sr.first_payment,
    p.id as profile_id
  from sheet_rows sr
  join lateral (
    select p.*
    from public.profiles p
    where exists (
      select 1
      from unnest(sr.aliases) alias
      where lower(trim(coalesce(p.nickname, ''))) = lower(alias)
        or lower(trim(coalesce(p.full_name, ''))) = lower(alias)
        or lower(coalesce(p.full_name, '')) like '%' || lower(alias) || '%'
        or lower(coalesce(p.nickname, '')) like '%' || lower(alias) || '%'
    )
    order by
      case
        when lower(trim(coalesce(p.nickname, ''))) = lower(sr.label) then 0
        when lower(trim(coalesce(p.nickname, ''))) = any(sr.aliases) then 1
        else 2
      end,
      p.created_at
    limit 1
  ) p on true
  order by sr.label
),
polera_fee as (
  select id
  from public.fees
  where lower(title) = lower('Poleras Chutus 2026')
  limit 1
),
deleted_seed as (
  delete from public.fee_payment_entries e
  using polera_fee f
  where e.fee_id = f.id
    and e.notes = 'Carga inicial Excel Poleras Chutus 2026'
  returning e.profile_id
),
inserted_seed as (
  insert into public.fee_payment_entries (
    fee_id,
    profile_id,
    amount,
    status,
    payment_method,
    notes,
    approved_at
  )
  select
    f.id,
    mp.profile_id,
    mp.first_payment,
    'paid',
    'manual',
    'Carga inicial Excel Poleras Chutus 2026',
    now()
  from matched_profiles mp
  cross join polera_fee f
  where mp.first_payment > 0
  returning fee_id, profile_id
)
select public.recalculate_fee_payment(f.id, fp.profile_id)
from polera_fee f
join public.fee_payments fp on fp.fee_id = f.id;

with polera_fee as (
  select id
  from public.fees
  where lower(title) = lower('Poleras Chutus 2026')
  limit 1
),
payment_rollup as (
  select
    fp.id,
    fp.amount_due,
    coalesce(sum(e.amount) filter (where e.status = 'paid'), 0) as amount_paid,
    coalesce(count(e.id) filter (where e.status = 'reviewing'), 0) > 0 as has_reviewing
  from public.fee_payments fp
  join polera_fee f on f.id = fp.fee_id
  left join public.fee_payment_entries e
    on e.fee_id = fp.fee_id
    and e.profile_id = fp.profile_id
  group by fp.id, fp.amount_due
)
update public.fee_payments fp
set
  amount_paid = pr.amount_paid,
  status = case
    when pr.amount_due > 0 and pr.amount_paid >= pr.amount_due then 'paid'
    when pr.has_reviewing then 'reviewing'
    else 'pending'
  end,
  paid_at = case
    when pr.amount_due > 0 and pr.amount_paid >= pr.amount_due then coalesce(fp.paid_at, now())
    else null
  end
from payment_rollup pr
where fp.id = pr.id;
