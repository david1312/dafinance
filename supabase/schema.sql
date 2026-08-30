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
  category_id uuid references public.categories (id) on delete set null,
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
create index transaction_audit_logs_owner_transaction_idx
  on public.transaction_audit_logs (owner_user_id, transaction_id, changed_at desc);

alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.transaction_audit_logs enable row level security;

create policy "own accounts" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rates" on public.exchange_rates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own transaction audit logs" on public.transaction_audit_logs
  for select using (auth.uid() = owner_user_id);

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
revoke execute on function public.handle_new_user() from public, anon, authenticated;
