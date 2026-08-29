export const CURRENCIES = ["IDR", "USD", "SGD"] as const;

export type Currency = (typeof CURRENCIES)[number];

export const BASE_CURRENCY: Currency = "IDR";

export const ACCOUNT_KINDS = ["cash", "bank", "ewallet", "credit"] as const;

export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export function formatMoney(amount: number, currency: Currency) {
  if (currency === "IDR") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
