import { BASE_CURRENCY, type Currency } from "./currencies";

export type RateRow = {
  from_currency: Currency;
  to_currency: Currency;
  rate: number;
};

export function toBaseAmount(
  amount: number,
  currency: Currency,
  rates: RateRow[],
): number {
  if (currency === BASE_CURRENCY) return amount;

  const direct = rates.find(
    (row) => row.from_currency === currency && row.to_currency === BASE_CURRENCY,
  );
  if (direct) return amount * Number(direct.rate);

  const inverse = rates.find(
    (row) => row.from_currency === BASE_CURRENCY && row.to_currency === currency,
  );
  if (inverse) return amount / Number(inverse.rate);

  return amount;
}
