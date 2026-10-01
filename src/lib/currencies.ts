export const CURRENCIES = ["IDR", "USD", "SGD", "JPY"] as const;

export type Currency = (typeof CURRENCIES)[number];

export const BASE_CURRENCY: Currency = "IDR";

export const ACCOUNT_KINDS = [
  "cash",
  "bank",
  "ewallet",
  "credit",
  "stock",
  "gold",
  "bond",
  "mutual_fund",
] as const;

export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  cash: "Cash",
  bank: "Bank",
  ewallet: "E-wallet",
  credit: "Credit",
  stock: "Stock",
  gold: "Gold",
  bond: "Bond",
  mutual_fund: "Mutual fund",
};

export function accountKindLabel(kind: AccountKind) {
  return ACCOUNT_KIND_LABELS[kind] ?? kind;
}

const CURRENCY_PREFIX: Record<Currency, string> = {
  IDR: "Rp",
  USD: "$",
  SGD: "SGD ",
  JPY: "¥",
};

export function formatMoney(amount: number, currency: Currency) {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  return `${amount < 0 ? "-" : ""}${CURRENCY_PREFIX[currency]}${formatted}`;
}
