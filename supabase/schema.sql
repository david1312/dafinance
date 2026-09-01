-- Paste this into the Supabase SQL editor once per project.

create type public.currency_code as enum ('IDR', 'USD', 'SGD', 'JPY');
create type public.account_kind as enum (
  'cash',
  'bank',
  'ewallet',
  'credit',
  'stock',
  'gold',
  'bond',
  'mutual_fund'
);
create type public.category_kind as enum ('income', 'expense');
create type public.transaction_kind as enum ('income', 'expense');

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

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind public.account_kind not null default 'bank',
  currency public.currency_code not null,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind public.category_kind not null,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete restrict,
  category_id uuid references public.categories (id) on delete restrict,
  amount numeric(18, 2) not null check (amount > 0),
  kind public.transaction_kind not null,
  note text,
  occurred_on date not null default (timezone('utc', now()))::date,
  creator_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id) on delete set null
);

create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  from_currency public.currency_code not null,
  to_currency public.currency_code not null,
  rate numeric(18, 6) not null check (rate > 0),
  updated_at timestamptz not null default now(),
  unique (user_id, from_currency, to_currency)
);

create table public.transaction_audit_logs (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_email text,
  action text not null check (action in ('created', 'modified', 'deleted')),
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts (user_id);
create index categories_user_id_idx on public.categories (user_id);
create index transactions_user_id_occurred_on_idx on public.transactions (user_id, occurred_on desc);
create index transactions_user_created_idx on public.transactions (user_id, created_at desc, id desc);
create index exchange_rates_user_id_idx on public.exchange_rates (user_id);
create index household_members_household_idx on public.household_members (household_id);
create index transaction_audit_logs_owner_transaction_idx
  on public.transaction_audit_logs (owner_user_id, transaction_id, changed_at desc);

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
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.transaction_audit_logs enable row level security;

create policy "household members can view household" on public.households
  for select using (id = public.current_household_id());

create policy "household members can view members" on public.household_members
  for select using (household_id = public.current_household_id());

create policy "household members can view accounts" on public.accounts
  for select using (public.is_household_member(user_id));

create policy "users can create own accounts" on public.accounts
  for insert with check (auth.uid() = user_id);

create policy "users can update own accounts" on public.accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users can delete own accounts" on public.accounts
  for delete using (auth.uid() = user_id);

create policy "household members can view categories" on public.categories
  for select using (public.is_household_member(user_id));

create policy "household members can create categories" on public.categories
  for insert with check (auth.uid() = user_id);

create policy "owner can delete unused household categories" on public.categories
  for delete using (
    public.is_household_owner()
    and public.is_household_member(user_id)
    and not exists (
      select 1 from public.transactions
      where transactions.category_id = categories.id
    )
  );

create policy "household members can view transactions" on public.transactions
  for select using (public.is_household_member(user_id));

create policy "household members can create transactions" on public.transactions
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.accounts
      where accounts.id = account_id
        and public.is_household_member(accounts.user_id)
    )
    and (
      category_id is null
      or exists (
        select 1 from public.categories
        where categories.id = category_id
          and public.is_household_member(categories.user_id)
          and categories.kind::text = transactions.kind::text
      )
    )
  );

create policy "household members can update transactions" on public.transactions
  for update
  using (public.is_household_member(user_id))
  with check (
    public.is_household_member(user_id)
    and exists (
      select 1 from public.accounts
      where accounts.id = account_id
        and public.is_household_member(accounts.user_id)
    )
    and (
      category_id is null
      or exists (
        select 1 from public.categories
        where categories.id = category_id
          and public.is_household_member(categories.user_id)
          and categories.kind::text = transactions.kind::text
      )
    )
  );

create policy "own rates" on public.exchange_rates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "household members can view transaction audit logs"
  on public.transaction_audit_logs
  for select using (public.is_household_member(owner_user_id));

create or replace function public.audit_transaction_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_action text;
  owner_id uuid;
  actor_id uuid;
  actor_email_value text;
begin
  owner_id := coalesce(new.user_id, old.user_id);
  actor_id := auth.uid();
  actor_email_value := coalesce(
    auth.jwt() ->> 'email',
    new.creator_email,
    old.creator_email
  );

  if tg_op = 'INSERT' then
    audit_action := 'created';
  elsif tg_op = 'DELETE' then
    audit_action := 'deleted';
  elsif old.deleted_at is null and new.deleted_at is not null then
    audit_action := 'deleted';
  else
    audit_action := 'modified';
  end if;

  insert into public.transaction_audit_logs (
    transaction_id,
    owner_user_id,
    actor_user_id,
    actor_email,
    action,
    old_data,
    new_data
  )
  values (
    coalesce(new.id, old.id),
    owner_id,
    actor_id,
    actor_email_value,
    audit_action,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  return coalesce(new, old);
end;
$$;

create trigger audit_transactions
  after insert or update or delete on public.transactions
  for each row execute function public.audit_transaction_change();

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
      select 1 from public.transactions
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
      select 1 from public.households where id = requested_household_id
    )
  then
    insert into public.household_members (
      user_id,
      household_id,
      role,
      email
    ) values (
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
  ) values (
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

  insert into public.exchange_rates (user_id, from_currency, to_currency, rate) values
    (new.id, 'USD', 'IDR', 16200),
    (new.id, 'SGD', 'IDR', 12000),
    (new.id, 'JPY', 'IDR', 110),
    (new.id, 'USD', 'SGD', 1.35),
    (new.id, 'USD', 'JPY', 148),
    (new.id, 'SGD', 'JPY', 110);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

revoke execute on function public.audit_transaction_change() from public, anon, authenticated;
revoke execute on function public.protect_transaction_identity() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
