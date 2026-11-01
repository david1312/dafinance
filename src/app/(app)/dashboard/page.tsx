import { DashboardView } from "@/components/dashboard-view";
import { BUDGET_CURRENCY } from "@/lib/budgets";
import { DASHBOARD_MIN_DATE } from "@/lib/dashboard-range";
import { fetchDailyRates } from "@/lib/fx";
import type { RateRow } from "@/lib/money";
import { savedRatesStale, syncSavedRates } from "@/lib/saved-rates";
import { createClient } from "@/lib/supabase/server";
import type { Account, Category, Transaction } from "@/lib/types";

/** A week before the first dashboard day, so it starts with a published rate. */
const RATES_FROM = new Date(Date.parse(`${DASHBOARD_MIN_DATE}T00:00:00Z`) - 7 * 864e5)
  .toISOString()
  .slice(0, 10);

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: accounts },
    { data: transactions },
    { data: categories },
    { data: rates },
    dailyRates,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("accounts").select("*").order("name"),
    supabase
      .from("transactions")
      .select("*")
      .is("deleted_at", null)
      .order("occurred_on", { ascending: false }),
    supabase.from("categories").select("*").order("name"),
    supabase
      .from("exchange_rates")
      .select("from_currency, to_currency, rate, updated_at"),
    fetchDailyRates(BUDGET_CURRENCY, RATES_FROM),
  ]);

  const accountList = (accounts ?? []) as Account[];
  const txList = (transactions ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  })) as Transaction[];
  const categoryList = (categories ?? []) as Category[];
  const savedRates = (rates ?? []).map((row) => ({
    ...row,
    rate: Number(row.rate),
  })) as (RateRow & { updated_at: string })[];

  // Keep the fallback rates current without a trip to Settings: at most one
  // write per ECB day, the first time someone opens the dashboard.
  let manualRates: RateRow[] = savedRates;
  if (user && dailyRates && savedRatesStale(savedRates, dailyRates)) {
    manualRates =
      (await syncSavedRates(supabase, user.id, dailyRates, savedRates)) ??
      savedRates;
  }

  return (
    <DashboardView
      accounts={accountList}
      categories={categoryList}
      dailyRates={dailyRates}
      manualRates={manualRates}
      transactions={txList}
    />
  );
}
