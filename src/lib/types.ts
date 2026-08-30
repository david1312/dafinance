import type { AccountKind, Currency } from "./currencies";

export type Account = {
  id: string;
  name: string;
  kind: AccountKind;
  currency: Currency;
};

export type Category = {
  id: string;
  name: string;
  kind: "income" | "expense";
};

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  kind: "income" | "expense";
  note: string | null;
  occurred_on: string;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
};

export type TransactionAuditAction = "created" | "modified" | "deleted";

export type TransactionAuditSnapshot = {
  account_id?: string;
  category_id?: string | null;
  amount?: number | string;
  kind?: "income" | "expense";
  note?: string | null;
  occurred_on?: string;
  creator_email?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type TransactionAuditLog = {
  id: string;
  transaction_id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: TransactionAuditAction;
  old_data: TransactionAuditSnapshot | null;
  new_data: TransactionAuditSnapshot | null;
  changed_at: string;
};

export type ExchangeRate = {
  id: string;
  from_currency: Currency;
  to_currency: Currency;
  rate: number;
  updated_at: string;
};
