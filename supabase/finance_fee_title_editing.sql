-- Editable finance charge names for treasurer/admin users.
-- Safe to run more than once.

create or replace function public.update_fee_title(p_fee_id uuid, p_title text)
returns public.fees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_fee public.fees;
begin
  if not public.is_finance_manager(auth.uid()) then
    raise exception 'Only finance managers can rename fees';
  end if;

  if v_title = '' then
    raise exception 'Fee title is required';
  end if;

  update public.fees
  set
    title = v_title,
    item_label = v_title
  where id = p_fee_id
  returning * into v_fee;

  if v_fee.id is null then
    raise exception 'Fee not found';
  end if;

  return v_fee;
end;
$$;

grant execute on function public.update_fee_title(uuid, text) to authenticated;

update public.fees
set
  title = 'Camisas Chutus',
  item_label = 'Camisas Chutus'
where lower(title) = lower('Poleras Chutus 2026');
