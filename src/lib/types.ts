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
  account_id: string;
  category_id: string | null;
  amount: number;
  kind: "income" | "expense";
  note: string | null;
  occurred_on: string;
};

export type ExchangeRate = {
  id: string;
  from_currency: Currency;
  to_currency: Currency;
  rate: number;
  updated_at: string;
};
