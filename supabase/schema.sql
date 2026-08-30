-- Paste this into the Supabase SQL editor once per project.

create type public.currency_code as enum ('IDR', 'USD', 'SGD', 'JPY');
create type public.account_kind as enum ('cash', 'bank', 'ewallet', 'credit');
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
  created_at timestamptz not null default now()
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

create index accounts_user_id_idx on public.accounts (user_id);
create index categories_user_id_idx on public.categories (user_id);
create index transactions_user_id_occurred_on_idx on public.transactions (user_id, occurred_on desc);
create index exchange_rates_user_id_idx on public.exchange_rates (user_id);

alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.exchange_rates enable row level security;

create policy "own accounts" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rates" on public.exchange_rates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
