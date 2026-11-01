import type { SupabaseClient } from "@supabase/supabase-js";
import type { Currency } from "./currencies";
import type { DailyRates } from "./fx";
import type { RateRow } from "./money";

export type RatePair = Pick<RateRow, "from_currency" | "to_currency">;

/** Always kept saved, since it's the one shown on the dashboard. */
const HEADLINE_PAIR: RatePair = { from_currency: "JPY", to_currency: "IDR" };

/**
 * True when a saved rate was written before the latest ECB day came out
 * (published ~16:00 CET; 16:00 UTC leaves room for Frankfurter's pickup),
 * or the headline pair is missing.
 */
export function savedRatesStale(
  saved: (RatePair & { updated_at: string })[],
  daily: DailyRates | null,
) {
  const latest = daily?.days.at(-1)?.date;
  if (!latest) return false;
  const publishedAt = Date.parse(`${latest}T16:00:00Z`);
  return (
    saved.some((row) => Date.parse(row.updated_at) < publishedAt) ||
    !saved.some(
      (row) =>
        row.from_currency === HEADLINE_PAIR.from_currency &&
        row.to_currency === HEADLINE_PAIR.to_currency,
    )
  );
}

/**
 * Overwrites the user's saved rates for `pairs` (plus JPY → IDR) with the
 * latest ECB day, so the manual fallback stays close to the live rates.
 * Returns the rows written, or null when nothing could be saved.
 */
export async function syncSavedRates(
  supabase: SupabaseClient,
  userId: string,
  daily: DailyRates,
  pairs: RatePair[],
): Promise<RateRow[] | null> {
  const latest = daily.days.at(-1);
  if (!latest) return null;
  const perBase: Partial<Record<Currency, number>> = {
    ...latest.rates,
    [daily.base]: 1,
  };

  const rows = new Map<string, RateRow>();
  for (const { from_currency, to_currency } of [...pairs, HEADLINE_PAIR]) {
    const from = perBase[from_currency];
    const to = perBase[to_currency];
    if (!from || !to || from_currency === to_currency) continue;
    rows.set(`${from_currency}-${to_currency}`, {
      from_currency,
      to_currency,
      rate: Number((to / from).toFixed(6)),
    });
  }
  if (rows.size === 0) return null;

  const updated_at = new Date().toISOString();
  const { error } = await supabase.from("exchange_rates").upsert(
    [...rows.values()].map((row) => ({ ...row, user_id: userId, updated_at })),
    { onConflict: "user_id,from_currency,to_currency" },
  );
  return error ? null : [...rows.values()];
}
