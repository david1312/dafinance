alter table public.transactions
  add column creator_email text,
  add column updated_at timestamptz not null default now(),
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users (id) on delete set null;

update public.transactions as transaction
set
  creator_email = auth_user.email,
  updated_at = transaction.created_at
from auth.users as auth_user
where auth_user.id = transaction.user_id;

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

create index transaction_audit_logs_owner_transaction_idx
  on public.transaction_audit_logs (owner_user_id, transaction_id, changed_at desc);

create index transactions_user_created_idx
  on public.transactions (user_id, created_at desc, id desc);

alter table public.transaction_audit_logs enable row level security;

create policy "own transaction audit logs"
  on public.transaction_audit_logs
  for select
  using (auth.uid() = owner_user_id);

insert into public.transaction_audit_logs (
  transaction_id,
  owner_user_id,
  actor_user_id,
  actor_email,
  action,
  new_data,
  changed_at
)
select
  transaction.id,
  transaction.user_id,
  transaction.user_id,
  transaction.creator_email,
  'created',
  to_jsonb(transaction),
  transaction.created_at
from public.transactions as transaction;

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
