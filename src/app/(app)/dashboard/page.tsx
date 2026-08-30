import { BASE_CURRENCY, CURRENCIES, formatMoney } from "@/lib/currencies";
import { toBaseAmount } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { CategoryDonut, type DonutSlice } from "@/components/category-donut";
import type { Account, Category, ExchangeRate, Transaction } from "@/lib/types";

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

  const [
    { data: accounts },
    { data: transactions },
    { data: rates },
    { data: categories },
  ] = await Promise.all([
    supabase.from("accounts").select("*").order("name"),
    supabase
      .from("transactions")
      .select("*")
      .order("occurred_on", { ascending: false }),
    supabase.from("exchange_rates").select("*"),
    supabase.from("categories").select("*"),
  ]);

  const accountList = (accounts ?? []) as Account[];
  const txList = (transactions ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  })) as Transaction[];
  const rateList = (rates ?? []).map((row) => ({
    ...row,
    rate: Number(row.rate),
  })) as ExchangeRate[];
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

  const baseOf = (tx: Transaction) =>
    toBaseAmount(
      tx.amount,
      accountById[tx.account_id]?.currency ?? BASE_CURRENCY,
      rateList,
    );

  const slicesFor = (kind: "income" | "expense"): DonutSlice[] => {
    const totals = monthTx
      .filter((tx) => tx.kind === kind)
      .reduce<Record<string, number>>((acc, tx) => {
        const label = tx.category_id
          ? (categoryById[tx.category_id]?.name ?? "Uncategorized")
          : "Uncategorized";
        acc[label] = (acc[label] ?? 0) + baseOf(tx);
        return acc;
      }, {});

    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value,
        display: `≈ ${formatMoney(value, BASE_CURRENCY)}`,
      }))
      .sort((a, b) => b.value - a.value);
  };

  const expenseSlices = slicesFor("expense");
  const incomeSlices = slicesFor("income");
  const expenseTotal = expenseSlices.reduce((sum, s) => sum + s.value, 0);
  const incomeTotal = incomeSlices.reduce((sum, s) => sum + s.value, 0);

  return (
    <div>
      <h1 className="text-4xl" style={{ fontFamily: "var(--font-display)" }}>
        {monthLabel}
      </h1>
      <p className="mt-1 text-[var(--muted)]">
        Net worth stays in each account&rsquo;s own currency.
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

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg">Expenses by category</h2>
            <p className="text-sm text-[var(--down)]">
              ≈ {formatMoney(expenseTotal, BASE_CURRENCY)}
            </p>
          </div>
          <CategoryDonut
            slices={expenseSlices}
            palette={EXPENSE_PALETTE}
            emptyLabel="No expenses this month yet."
            centerLabel="Spending"
          />
        </article>

        <article className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg">Income by category</h2>
            <p className="text-sm text-[var(--up)]">
              ≈ {formatMoney(incomeTotal, BASE_CURRENCY)}
            </p>
          </div>
          <CategoryDonut
            slices={incomeSlices}
            palette={INCOME_PALETTE}
            emptyLabel="No income this month yet."
            centerLabel="Income"
          />
        </article>
      </section>

      <p className="mt-6 text-xs text-[var(--muted)]">
        Category shares are compared in {BASE_CURRENCY} using your saved rates,
        since a single chart cannot mix currencies.
      </p>
    </div>
  );
}
