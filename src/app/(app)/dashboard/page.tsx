import { DashboardView } from "@/components/dashboard-view";
import { BUDGET_CURRENCY } from "@/lib/budgets";
import { DASHBOARD_MIN_DATE } from "@/lib/dashboard-range";
import { fetchDailyRates } from "@/lib/fx";
import type { RateRow } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import type { Account, Category, Transaction } from "@/lib/types";

/** A week before the first dashboard day, so it starts with a published rate. */
const RATES_FROM = new Date(Date.parse(`${DASHBOARD_MIN_DATE}T00:00:00Z`) - 7 * 864e5)
  .toISOString()
  .slice(0, 10);

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { data: accounts },
    { data: transactions },
    { data: categories },
    { data: rates },
    dailyRates,
  ] = await Promise.all([
    supabase.from("accounts").select("*").order("name"),
    supabase
      .from("transactions")
      .select("*")
      .is("deleted_at", null)
      .order("occurred_on", { ascending: false }),
    supabase.from("categories").select("*").order("name"),
    supabase.from("exchange_rates").select("from_currency, to_currency, rate"),
    fetchDailyRates(BUDGET_CURRENCY, RATES_FROM),
  ]);

  const accountList = (accounts ?? []) as Account[];
  const txList = (transactions ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  })) as Transaction[];
  const categoryList = (categories ?? []) as Category[];
  const manualRates = (rates ?? []).map((row) => ({
    ...row,
    rate: Number(row.rate),
  })) as RateRow[];

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
