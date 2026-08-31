create table public.households (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.household_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  email text not null,
  created_at timestamptz not null default now(),
  unique (household_id, email)
);

create index household_members_household_idx
  on public.household_members (household_id);

insert into public.households (owner_user_id)
select id
from auth.users
on conflict (owner_user_id) do nothing;

insert into public.household_members (user_id, household_id, role, email)
select
  auth_user.id,
  household.id,
  'owner',
  coalesce(auth_user.email, auth_user.id::text)
from auth.users as auth_user
join public.households as household
  on household.owner_user_id = auth_user.id
on conflict (user_id) do nothing;

create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select member.household_id
  from public.household_members as member
  where member.user_id = auth.uid()
$$;

create or replace function public.current_household_owner_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household.owner_user_id
  from public.households as household
  where household.id = public.current_household_id()
$$;

create or replace function public.is_household_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select member.role = 'owner'
      from public.household_members as member
      where member.user_id = auth.uid()
    ),
    false
  )
$$;

create or replace function public.is_household_member(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members as member
    where member.user_id = target_user_id
      and member.household_id = public.current_household_id()
  )
$$;

revoke execute on function public.current_household_id() from public, anon;
revoke execute on function public.current_household_owner_id() from public, anon;
revoke execute on function public.is_household_owner() from public, anon;
revoke execute on function public.is_household_member(uuid) from public, anon;
grant execute on function public.current_household_id() to authenticated;
grant execute on function public.current_household_owner_id() to authenticated;
grant execute on function public.is_household_owner() to authenticated;
grant execute on function public.is_household_member(uuid) to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;

create policy "household members can view household"
  on public.households
  for select
  using (id = public.current_household_id());

create policy "household members can view members"
  on public.household_members
  for select
  using (household_id = public.current_household_id());

drop policy if exists "own accounts" on public.accounts;

create policy "household members can view accounts"
  on public.accounts
  for select
  using (public.is_household_member(user_id));

create policy "users can create own accounts"
  on public.accounts
  for insert
  with check (user_id = auth.uid());

create policy "users can update own accounts"
  on public.accounts
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users can delete own accounts"
  on public.accounts
  for delete
  using (user_id = auth.uid());

drop policy if exists "own categories" on public.categories;

create policy "household members can view categories"
  on public.categories
  for select
  using (public.is_household_member(user_id));

create policy "household members can create categories"
  on public.categories
  for insert
  with check (user_id = auth.uid());

create policy "owner can delete unused household categories"
  on public.categories
  for delete
  using (
    public.is_household_owner()
    and public.is_household_member(user_id)
    and not exists (
      select 1
      from public.transactions as transaction
      where transaction.category_id = categories.id
    )
  );

alter table public.transactions
  drop constraint transactions_category_id_fkey;

alter table public.transactions
  add constraint transactions_category_id_fkey
  foreign key (category_id)
  references public.categories (id)
  on delete restrict;

drop policy if exists "own transactions" on public.transactions;

create policy "household members can view transactions"
  on public.transactions
  for select
  using (public.is_household_member(user_id));

create policy "household members can create transactions"
  on public.transactions
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.accounts as account
      where account.id = account_id
        and public.is_household_member(account.user_id)
    )
    and (
      category_id is null
      or exists (
        select 1
        from public.categories as category
        where category.id = category_id
          and public.is_household_member(category.user_id)
          and category.kind::text = transactions.kind::text
      )
    )
  );

create policy "household members can update transactions"
  on public.transactions
  for update
  using (public.is_household_member(user_id))
  with check (
    public.is_household_member(user_id)
    and exists (
      select 1
      from public.accounts as account
      where account.id = account_id
        and public.is_household_member(account.user_id)
    )
    and (
      category_id is null
      or exists (
        select 1
        from public.categories as category
        where category.id = category_id
          and public.is_household_member(category.user_id)
          and category.kind::text = transactions.kind::text
      )
    )
  );

create or replace function public.protect_transaction_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id <> old.user_id then
    raise exception 'Transaction creator cannot be changed';
  end if;

  if new.creator_email is distinct from old.creator_email then
    raise exception 'Transaction creator email cannot be changed';
  end if;

  return new;
end;
$$;

create trigger protect_transaction_identity
  before update on public.transactions
  for each row execute function public.protect_transaction_identity();

revoke execute on function public.protect_transaction_identity()
  from public, anon, authenticated;

drop policy if exists "own transaction audit logs"
  on public.transaction_audit_logs;

create policy "household members can view transaction audit logs"
  on public.transaction_audit_logs
  for select
  using (public.is_household_member(owner_user_id));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_household_id uuid;
  new_household_id uuid;
begin
  requested_household_id :=
    nullif(new.raw_app_meta_data ->> 'household_id', '')::uuid;

  if requested_household_id is not null
    and new.raw_app_meta_data ->> 'household_role' = 'member'
    and exists (
      select 1
      from public.households
      where id = requested_household_id
    )
  then
    insert into public.household_members (
      user_id,
      household_id,
      role,
      email
    )
    values (
      new.id,
      requested_household_id,
      'member',
      coalesce(new.email, new.id::text)
    );

    return new;
  end if;

  insert into public.households (owner_user_id)
  values (new.id)
  returning id into new_household_id;

  insert into public.household_members (
    user_id,
    household_id,
    role,
    email
  )
  values (
    new.id,
    new_household_id,
    'owner',
    coalesce(new.email, new.id::text)
  );

  insert into public.categories (user_id, name, kind) values
    (new.id, 'Salary', 'income'),
    (new.id, 'Freelance', 'income'),
    (new.id, 'Food', 'expense'),
    (new.id, 'Transport', 'expense'),
    (new.id, 'Housing', 'expense'),
    (new.id, 'Subscriptions', 'expense');

  insert into public.exchange_rates (
    user_id,
    from_currency,
    to_currency,
    rate
  ) values
    (new.id, 'USD', 'IDR', 16200),
    (new.id, 'SGD', 'IDR', 12000),
    (new.id, 'JPY', 'IDR', 110),
    (new.id, 'USD', 'SGD', 1.35),
    (new.id, 'USD', 'JPY', 148),
    (new.id, 'SGD', 'JPY', 110);

  return new;
end;
$$;

revoke execute on function public.handle_new_user()
  from public, anon, authenticated;
