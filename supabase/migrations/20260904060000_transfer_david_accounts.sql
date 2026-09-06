do $$
declare
  target_user_id uuid;
  target_household_id uuid;
  migrated_count integer;
begin
  select auth_user.id, member.household_id
  into target_user_id, target_household_id
  from auth.users as auth_user
  join public.household_members as member
    on member.user_id = auth_user.id
  where lower(auth_user.email) = lower('bernadi73@gmail.com')
  limit 1;

  if target_user_id is null then
    raise exception 'User bernadi73@gmail.com was not found';
  end if;

  update public.accounts as account
  set user_id = target_user_id
  where account.name like '%DAVID%'
    and account.user_id in (
      select household_member.user_id
      from public.household_members as household_member
      where household_member.household_id = target_household_id
    );

  get diagnostics migrated_count = row_count;

  if migrated_count = 0 then
    raise exception 'No same-household accounts containing DAVID were found';
  end if;
end;
$$;