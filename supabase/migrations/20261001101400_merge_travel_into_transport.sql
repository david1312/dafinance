-- Rename "Transport" → "Transport / Travel" for every user.
-- Then merge the "Travel" category (if it exists) into the renamed one:
--   • transactions attached to "Travel" are re-pointed to "Transport / Travel"
--   • the now-empty "Travel" category row is deleted.
-- If a user only has "Travel" (no "Transport") it is renamed directly.

do $$
declare
  travel_rec         record;
  transport_new_id   uuid;
  migrated           integer;
  total_renamed      integer := 0;
  total_tx_moved     integer := 0;
  total_travel_del   integer := 0;
begin

  -- ----------------------------------------------------------------
  -- Step 1: rename every "Transport" → "Transport / Travel"
  -- ----------------------------------------------------------------
  update public.categories
  set    name = 'Transport / Travel'
  where  name = 'Transport'
    and  kind = 'expense';

  get diagnostics total_renamed = row_count;

  -- ----------------------------------------------------------------
  -- Step 2: handle every remaining "Travel" category
  -- ----------------------------------------------------------------
  for travel_rec in
    select *
    from   public.categories
    where  name = 'Travel'
      and  kind = 'expense'
  loop

    -- Does this user already have a "Transport / Travel" category?
    select id
    into   transport_new_id
    from   public.categories
    where  user_id = travel_rec.user_id
      and  name    = 'Transport / Travel'
      and  kind    = 'expense';

    if transport_new_id is null then
      -- No Transport for this user → just rename Travel in-place
      update public.categories
      set    name = 'Transport / Travel'
      where  id   = travel_rec.id;

      total_renamed := total_renamed + 1;

    else
      -- Re-point all Travel transactions to Transport / Travel
      update public.transactions
      set    category_id = transport_new_id
      where  category_id = travel_rec.id;

      get diagnostics migrated = row_count;
      total_tx_moved   := total_tx_moved   + migrated;

      -- Delete the now-empty Travel category
      delete from public.categories where id = travel_rec.id;
      total_travel_del := total_travel_del + 1;
    end if;

  end loop;

  raise notice 'Renamed     % "Transport"  →  "Transport / Travel"', total_renamed;
  raise notice 'Moved       % transaction(s) from "Travel" to "Transport / Travel"', total_tx_moved;
  raise notice 'Deleted     % "Travel" category row(s)', total_travel_del;

end;
$$;
