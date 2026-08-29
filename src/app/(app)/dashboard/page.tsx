import { BASE_CURRENCY, formatMoney, type Currency } from "@/lib/currencies";
import { toBaseAmount } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { SpendingChart } from "@/components/spending-chart";
import type { Account, Category, ExchangeRate, Transaction } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: transactions }, { data: rates }, { data: categories }] =
    await Promise.all([
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

  const byCurrency = CURRENCY_TOTALS(accountList, txList);

  const incomeIdr = monthTx
    .filter((tx) => tx.kind === "income")
    .reduce(
      (sum, tx) =>
        sum +
        toBaseAmount(
          tx.amount,
          accountById[tx.account_id]?.currency ?? BASE_CURRENCY,
          rateList,
        ),
      0,
    );
  const expenseIdr = monthTx
    .filter((tx) => tx.kind === "expense")
    .reduce(
      (sum, tx) =>
        sum +
        toBaseAmount(
          tx.amount,
          accountById[tx.account_id]?.currency ?? BASE_CURRENCY,
          rateList,
        ),
      0,
    );

  const netIdr = accountList.reduce((sum, account) => {
    const local = balanceFor(account.id, txList);
    return sum + toBaseAmount(local, account.currency, rateList);
  }, 0);

  const spendByCategory = monthTx
    .filter((tx) => tx.kind === "expense")
    .reduce<Record<string, number>>((acc, tx) => {
      const label = tx.category_id
        ? categoryById[tx.category_id]?.name ?? "Uncategorized"
        : "Uncategorized";
      const value = toBaseAmount(
        tx.amount,
        accountById[tx.account_id]?.currency ?? BASE_CURRENCY,
        rateList,
      );
      acc[label] = (acc[label] ?? 0) + value;
      return acc;
    }, {});

  return (
    <div>
      <h1
        className="text-4xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        This month
      </h1>
      <p className="mt-1 text-[var(--muted)]">
        Totals converted to {BASE_CURRENCY} using your saved rates.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Net worth (IDR)" value={formatMoney(netIdr, "IDR")} />
        <Stat
          label="Income"
          value={formatMoney(incomeIdr, "IDR")}
          tone="up"
        />
        <Stat
          label="Spending"
          value={formatMoney(expenseIdr, "IDR")}
          tone="down"
        />
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {byCurrency.map((row) => (
          <article
            key={row.currency}
            className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5"
          >
            <p className="text-sm text-[var(--muted)]">{row.currency} cash</p>
            <p className="mt-2 text-2xl">{formatMoney(row.balance, row.currency)}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <h2 className="text-lg">Spending by category</h2>
        <SpendingChart data={spendByCategory} />
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p
        className="mt-2 text-2xl"
        style={{
          color:
            tone === "up"
              ? "var(--up)"
              : tone === "down"
                ? "var(--down)"
                : undefined,
        }}
      >
        {value}
      </p>
    </article>
  );
}

function balanceFor(accountId: string, transactions: Transaction[]) {
  return transactions
    .filter((tx) => tx.account_id === accountId)
    .reduce((sum, tx) => sum + (tx.kind === "income" ? tx.amount : -tx.amount), 0);
}

function CURRENCY_TOTALS(accounts: Account[], transactions: Transaction[]) {
  const currencies: Currency[] = ["IDR", "USD", "SGD"];
  return currencies.map((currency) => {
    const ids = accounts.filter((a) => a.currency === currency).map((a) => a.id);
    const balance = transactions
      .filter((tx) => ids.includes(tx.account_id))
      .reduce(
        (sum, tx) => sum + (tx.kind === "income" ? tx.amount : -tx.amount),
        0,
      );
    return { currency, balance };
  });
}
