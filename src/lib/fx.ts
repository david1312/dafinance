import { BASE_CURRENCY, CURRENCIES, type Currency } from "./currencies";
import type { RateRow } from "./money";

/**
 * Daily reference rates, oldest first: on `date`, 1 `base` = rates[currency].
 * ECB publishes on business days only, so weekends and holidays use the
 * last published day.
 */
export type DailyRates = {
  base: Currency;
  days: { date: string; rates: Partial<Record<Currency, number>> }[];
};

/** Free ECB rates, no API key. Cached for a few hours per server. */
export async function fetchDailyRates(
  base: Currency,
  from: string,
): Promise<DailyRates | null> {
  const symbols = CURRENCIES.filter((currency) => currency !== base).join(",");
  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v1/${from}..?base=${base}&symbols=${symbols}`,
      { next: { revalidate: 60 * 60 * 6 } },
    );
    if (!response.ok) return null;

    const body = (await response.json()) as {
      rates?: Record<string, Partial<Record<Currency, number>>>;
    };
    const days = Object.entries(body.rates ?? {})
      .map(([date, rates]) => ({ date, rates }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return days.length > 0 ? { base, days } : null;
  } catch {
    return null;
  }
}

function manualRate(
  from: Currency,
  to: Currency,
  rates: RateRow[],
): number | null {
  if (from === to) return 1;
  const direct = rates.find(
    (row) => row.from_currency === from && row.to_currency === to,
  );
  if (direct) return Number(direct.rate);
  const inverse = rates.find(
    (row) => row.from_currency === to && row.to_currency === from,
  );
  if (inverse) return 1 / Number(inverse.rate);
  return null;
}

/**
 * Returns a converter into `target` that uses the daily rate on each
 * transaction's own date, falling back to the saved manual rates (directly
 * or through IDR) when no daily rate is available. Null means unconvertible.
 */
export function makeConverter(
  target: Currency,
  daily: DailyRates | null,
  manualRates: RateRow[],
) {
  const days = daily?.base === target ? daily.days : [];

  return (amount: number, currency: Currency, date: string): number | null => {
    if (currency === target) return amount;

    // Latest published day on or before `date`; the first day if earlier.
    let day = days[0];
    for (const candidate of days) {
      if (candidate.date > date) break;
      day = candidate;
    }
    const rate = day?.rates[currency];
    if (rate) return amount / rate;

    const direct = manualRate(currency, target, manualRates);
    if (direct) return amount * direct;
    const toBase = manualRate(currency, BASE_CURRENCY, manualRates);
    const fromBase = manualRate(BASE_CURRENCY, target, manualRates);
    if (toBase && fromBase) return amount * toBase * fromBase;
    return null;
  };
}

/**
 * The latest rate for 1 `from` in `to`, with the ECB day it was published.
 * Date is null when it comes from the saved manual rates instead.
 */
export function latestRate(
  from: Currency,
  to: Currency,
  daily: DailyRates | null,
  manualRates: RateRow[],
): { rate: number; date: string | null } | null {
  const last = daily?.base === from ? daily.days.at(-1) : undefined;
  const rate = last?.rates[to];
  if (last && rate) return { rate, date: last.date };

  const manual = makeConverter(to, null, manualRates)(1, from, "");
  return manual === null ? null : { rate: manual, date: null };
}
