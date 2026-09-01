-- handle_new_user() runs before GoTrue applies admin-supplied app_metadata, so a
-- new member always lands in its own household first. The owner's server action
-- calls this to move them across afterwards.
create or replace function public.attach_user_to_household(
  target_user_id uuid,
  target_household_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  orphan_household_id uuid;
  member_email text;
begin
  select id into orphan_household_id
  from public.households
  where owner_user_id = target_user_id;

  select coalesce(email, target_user_id::text) into member_email
  from auth.users
  where id = target_user_id;

  if member_email is null then
    raise exception 'Unknown user %', target_user_id;
  end if;

  delete from public.categories
  where user_id = target_user_id
    and not exists (
      select 1
      from public.transactions
      where transactions.category_id = categories.id
    );

  delete from public.exchange_rates
  where user_id = target_user_id;

  insert into public.household_members (user_id, household_id, role, email)
  values (target_user_id, target_household_id, 'member', member_email)
  on conflict (user_id) do update
    set household_id = excluded.household_id,
        role = 'member';

  if orphan_household_id is not null then
    delete from public.households where id = orphan_household_id;
  end if;
end;
$$;

revoke execute on function public.attach_user_to_household(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.attach_user_to_household(uuid, uuid)
  to service_role;
