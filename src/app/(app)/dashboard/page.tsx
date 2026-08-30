import { CURRENCIES, formatMoney, type Currency } from "@/lib/currencies";
import { createClient } from "@/lib/supabase/server";
import { CategoryDonut, type DonutSlice } from "@/components/category-donut";
import type { Account, Category, Transaction } from "@/lib/types";

const EXPENSE_PALETTE = [
  "#e4879f",
  "#f2a8bb",
  "#cf5f80",
  "#f7cdd8",
  "#b1697f",
  "#ff9db5",
  "#d98fa3",
];

const INCOME_PALETTE = [
  "#6fae8b",
  "#93c7a6",
  "#4f8f6c",
  "#bfe0cc",
  "#7fb9a2",
  "#5aa383",
  "#a8d4ba",
];

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: transactions }, { data: categories }] =
    await Promise.all([
      supabase.from("accounts").select("*").order("name"),
      supabase
        .from("transactions")
        .select("*")
        .is("deleted_at", null)
        .order("occurred_on", { ascending: false }),
      supabase.from("categories").select("*"),
    ]);

  const accountList = (accounts ?? []) as Account[];
  const txList = (transactions ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  })) as Transaction[];
  const categoryList = (categories ?? []) as Category[];

  const accountById = Object.fromEntries(accountList.map((a) => [a.id, a]));
  const categoryById = Object.fromEntries(categoryList.map((c) => [c.id, c]));

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthTx = txList.filter((tx) => tx.occurred_on.startsWith(monthPrefix));
  const monthLabel = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const netByCurrency = CURRENCIES.map((currency) => {
    const ids = accountList
      .filter((account) => account.currency === currency)
      .map((account) => account.id);

    const balance = txList
      .filter((tx) => ids.includes(tx.account_id))
      .reduce(
        (sum, tx) => sum + (tx.kind === "income" ? tx.amount : -tx.amount),
        0,
      );

    return { currency, balance, accounts: ids.length };
  }).filter((row) => row.accounts > 0);

  const currencyOf = (tx: Transaction): Currency =>
    accountById[tx.account_id]?.currency ?? "IDR";

  const slicesFor = (
    kind: "income" | "expense",
    currency: Currency,
  ): DonutSlice[] => {
    const totals = monthTx
      .filter((tx) => tx.kind === kind && currencyOf(tx) === currency)
      .reduce<Record<string, number>>((acc, tx) => {
        const label = tx.category_id
          ? (categoryById[tx.category_id]?.name ?? "Uncategorized")
          : "Uncategorized";
        acc[label] = (acc[label] ?? 0) + tx.amount;
        return acc;
      }, {});

    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value,
        display: formatMoney(value, currency),
      }))
      .sort((a, b) => b.value - a.value);
  };

  const chartCurrencies = CURRENCIES.filter((currency) =>
    monthTx.some((tx) => currencyOf(tx) === currency),
  );

  return (
    <div>
      <h1 className="text-4xl" style={{ fontFamily: "var(--font-display)" }}>
        {monthLabel}
      </h1>
      <p className="mt-1 text-[var(--muted)]">
        Amounts stay in each account&rsquo;s own currency. Nothing is converted.
      </p>

      <section className="mt-8">
        <h2 className="text-sm tracking-[0.14em] text-[var(--muted)] uppercase">
          Net worth by currency
        </h2>
        {netByCurrency.length === 0 ? (
          <p className="mt-4 text-[var(--muted)]">
            Add an account to see balances here.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {netByCurrency.map((row) => (
              <article
                key={row.currency}
                className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5"
              >
                <p className="text-sm text-[var(--muted)]">{row.currency}</p>
                <p className="mt-2 text-2xl">
                  {formatMoney(row.balance, row.currency)}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {row.accounts} account{row.accounts > 1 ? "s" : ""}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      {chartCurrencies.length === 0 ? (
        <p className="mt-10 text-[var(--muted)]">
          No income or expenses this month yet.
        </p>
      ) : (
        chartCurrencies.map((currency) => {
          const expenseSlices = slicesFor("expense", currency);
          const incomeSlices = slicesFor("income", currency);
          const expenseTotal = expenseSlices.reduce((sum, s) => sum + s.value, 0);
          const incomeTotal = incomeSlices.reduce((sum, s) => sum + s.value, 0);

          return (
            <section key={currency} className="mt-10">
              <h2 className="text-sm tracking-[0.14em] text-[var(--muted)] uppercase">
                {currency} this month
              </h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <article className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg">Expenses by category</h3>
                    <p className="text-sm text-[var(--down)]">
                      {formatMoney(expenseTotal, currency)}
                    </p>
                  </div>
                  <CategoryDonut
                    slices={expenseSlices}
                    palette={EXPENSE_PALETTE}
                    emptyLabel={`No ${currency} expenses this month.`}
                    centerLabel={`${currency} spending`}
                    totalDisplay={formatMoney(expenseTotal, currency)}
                  />
                </article>

                <article className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg">Income by category</h3>
                    <p className="text-sm text-[var(--up)]">
                      {formatMoney(incomeTotal, currency)}
                    </p>
                  </div>
                  <CategoryDonut
                    slices={incomeSlices}
                    palette={INCOME_PALETTE}
                    emptyLabel={`No ${currency} income this month.`}
                    centerLabel={`${currency} income`}
                    totalDisplay={formatMoney(incomeTotal, currency)}
                  />
                </article>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
