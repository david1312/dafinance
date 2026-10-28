"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { CategoryDonut, type DonutSlice } from "@/components/category-donut";
import {
  NetChangeBadge,
  SummaryCard,
  netChangeColor,
} from "@/components/report-summary";
import { SearchableAccountSelect } from "@/components/searchable-account-select";
import { categoryBucket, type CategoryBucket } from "@/lib/category-buckets";
import {
  CURRENCIES,
  formatMoney,
  formatSignedMoney,
  type Currency,
} from "@/lib/currencies";
import {
  DASHBOARD_MIN_DATE,
  RANGE_PRESETS,
  clampDashboardDate,
  formatRangeLabel,
  inDateRange,
  rangeForPreset,
  todayIso,
  type RangePreset,
} from "@/lib/dashboard-range";
import type { Account, Category, Transaction } from "@/lib/types";

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

const EXPENSE_PALETTE = [
  "#e4879f", "#f2a8bb", "#cf5f80", "#f7cdd8", "#b1697f", "#ff9db5", "#d98fa3",
];

const INCOME_PALETTE = [
  "#6fae8b", "#93c7a6", "#4f8f6c", "#bfe0cc", "#7fb9a2", "#5aa383", "#a8d4ba",
];

/** Donut slices beyond this are folded into "Other" (palette has 7 colours). */
const MAX_SLICES = 6;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type CategoryTotal = { name: string; value: number };

type MovementRow = {
  name: string;
  bucket: Exclude<CategoryBucket, "everyday">;
  inAmount: number;
  outAmount: number;
};

type CurrencySummary = {
  income: CategoryTotal[];
  expense: CategoryTotal[];
  incomeTotal: number;
  expenseTotal: number;
  movements: MovementRow[];
};

/**
 * Splits a currency's transactions into everyday income/expense (per
 * category) and transfers/investing (per category, money in vs out).
 */
function summarizeCurrency(
  transactions: Transaction[],
  categoryById: Record<string, Category>,
): CurrencySummary {
  const income: Record<string, number> = {};
  const expense: Record<string, number> = {};
  const movements: Record<string, MovementRow> = {};

  for (const tx of transactions) {
    const category = tx.category_id ? categoryById[tx.category_id] : undefined;
    const name = category?.name ?? "Uncategorized";
    const bucket = categoryBucket(category);

    if (bucket === "everyday") {
      const totals = tx.kind === "income" ? income : expense;
      totals[name] = (totals[name] ?? 0) + tx.amount;
      continue;
    }

    const row = (movements[name] ??= {
      name,
      bucket,
      inAmount: 0,
      outAmount: 0,
    });
    if (tx.kind === "income") row.inAmount += tx.amount;
    else row.outAmount += tx.amount;
  }

  const sorted = (totals: Record<string, number>) =>
    Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  const sum = (totals: CategoryTotal[]) =>
    totals.reduce((total, row) => total + row.value, 0);

  const incomeRows = sorted(income);
  const expenseRows = sorted(expense);

  return {
    income: incomeRows,
    expense: expenseRows,
    incomeTotal: sum(incomeRows),
    expenseTotal: sum(expenseRows),
    movements: Object.values(movements).sort(
      (a, b) =>
        a.bucket.localeCompare(b.bucket) ||
        b.inAmount + b.outAmount - (a.inAmount + a.outAmount),
    ),
  };
}

function toSlices(totals: CategoryTotal[], currency: Currency): DonutSlice[] {
  const top =
    totals.length > MAX_SLICES + 1 ? totals.slice(0, MAX_SLICES) : totals;
  const rest = totals.slice(top.length);
  const slices = top.map((row) => ({
    ...row,
    display: formatMoney(row.value, currency),
  }));
  if (rest.length > 0) {
    const value = rest.reduce((total, row) => total + row.value, 0);
    slices.push({
      name: `Other (${rest.length} categories)`,
      value,
      display: formatMoney(value, currency),
    });
  }
  return slices;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type DashboardViewProps = {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
};

export function DashboardView({
  accounts,
  categories,
  transactions,
}: DashboardViewProps) {
  const [preset, setPreset] = useState<RangePreset>("this_month");
  const [customFrom, setCustomFrom] = useState(DASHBOARD_MIN_DATE);
  const [customTo, setCustomTo] = useState(todayIso());
  const [accountId, setAccountId] = useState("");
  const [netWorthExpanded, setNetWorthExpanded] = useState(false);

  const { from, to } = rangeForPreset(preset, customFrom, customTo);
  const rangeLabel = formatRangeLabel(from, to);
  const maxDate = todayIso();

  const accountById = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const periodTransactions = useMemo(
    () =>
      transactions.filter(
        (tx) =>
          inDateRange(tx.occurred_on, from, to) &&
          (!accountId || tx.account_id === accountId),
      ),
    [accountId, from, to, transactions],
  );

  const netWorthTransactions = useMemo(
    () => transactions.filter((tx) => tx.occurred_on <= to),
    [to, transactions],
  );

  const dashboardAccounts = accountId
    ? accounts.filter((a) => a.id === accountId)
    : accounts;

  const netByCurrency = CURRENCIES.map((currency) => {
    const currencyAccounts = dashboardAccounts.filter(
      (a) => a.currency === currency,
    );
    const ids = currencyAccounts.map((a) => a.id);
    const balance = netWorthTransactions
      .filter((tx) => ids.includes(tx.account_id))
      .reduce(
        (sum, tx) => sum + (tx.kind === "income" ? tx.amount : -tx.amount),
        0,
      );
    return { currency, balance, accounts: currencyAccounts };
  }).filter((row) => row.accounts.length > 0);

  const currencyOf = (tx: Transaction): Currency =>
    accountById[tx.account_id]?.currency ?? "IDR";

  const chartCurrencies = CURRENCIES.filter((currency) =>
    periodTransactions.some((tx) => currencyOf(tx) === currency),
  );

  return (
    <div className="relative">
      <Image
        alt="dafinance"
        className="pointer-events-none absolute right-0 top-0 z-10 h-24 w-24 rounded-2xl object-contain lg:h-[240px] lg:w-[240px]"
        height={240}
        src="/icon.svg"
        unoptimized
        width={240}
      />

      <h1 className="text-4xl" style={{ fontFamily: "var(--font-display)" }}>
        {preset === "custom"
          ? "Custom range"
          : RANGE_PRESETS.find((item) => item.id === preset)?.label}
      </h1>
      <p className="mt-1 text-[var(--muted)]">
        {rangeLabel}. Amounts stay in each account&rsquo;s own currency.
      </p>

      {/* ------------------------------------------------------------------ */}
      {/* Net worth                                                            */}
      {/* ------------------------------------------------------------------ */}
      <section className="mt-8">
        <h2 className="text-sm tracking-[0.14em] text-[var(--muted)] uppercase">
          Net worth by currency
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Balances as of {formatRangeLabel(to, to)}.
        </p>

        {netByCurrency.length === 0 ? (
          <p className="mt-4 text-[var(--muted)]">
            Add an account to see balances here.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {netByCurrency.map((row) => (
              <details
                key={row.currency}
                open={netWorthExpanded}
                className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5"
              >
                <summary
                  className="cursor-pointer list-none"
                  onClick={(e) => {
                    e.preventDefault();
                    setNetWorthExpanded((v) => !v);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-[var(--muted)]">{row.currency}</p>
                      <p className="mt-2 text-2xl">
                        {formatMoney(row.balance, row.currency)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--accent-strong)]">
                        {row.accounts.length} account
                        {row.accounts.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`accordion-arrow mt-1 text-lg text-[var(--accent-strong)] ${
                        netWorthExpanded ? "accordion-arrow-open" : ""
                      }`}
                    >
                      &gt;
                    </span>
                  </div>
                </summary>
                <div
                  className={`accordion-content ${
                    netWorthExpanded ? "accordion-content-open" : ""
                  }`}
                >
                  <ul className="accordion-content-inner mt-4 space-y-2 border-t border-[var(--line)] pt-4">
                    {row.accounts.map((account) => (
                      <li
                        key={account.id}
                        className="flex items-center justify-between gap-4 text-sm"
                      >
                        <span className="truncate">{account.name}</span>
                        <span className="shrink-0 text-[var(--muted)]">
                          {formatMoney(
                            netWorthTransactions
                              .filter((tx) => tx.account_id === account.id)
                              .reduce(
                                (sum, tx) =>
                                  sum +
                                  (tx.kind === "income"
                                    ? tx.amount
                                    : -tx.amount),
                                0,
                              ),
                            account.currency,
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Controls: account filter + range presets                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-8">
        <div className="inline-block rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4">
          <h2 className="text-sm text-[var(--muted)]">Filter account</h2>
          <div className="mt-3 min-w-52">
            <SearchableAccountSelect
              accounts={accounts}
              allowEmpty
              name="dashboard-account"
              required={false}
              onChange={setAccountId}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {RANGE_PRESETS.map((item) => (
          <button
            key={item.id}
            className={`min-h-10 rounded-full border px-3 py-1.5 text-sm transition ${
              preset === item.id
                ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                : "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:border-[var(--accent)]"
            }`}
            type="button"
            onClick={() => {
              if (item.id === "custom") {
                setCustomFrom(from);
                setCustomTo(to);
              }
              setPreset(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {preset === "custom" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm text-[var(--muted)]">
            From
            <input
              className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
              max={customTo < maxDate ? customTo : maxDate}
              min={DASHBOARD_MIN_DATE}
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(clampDashboardDate(e.target.value))}
            />
          </label>
          <label className="grid gap-1 text-sm text-[var(--muted)]">
            To
            <input
              className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
              max={maxDate}
              min={customFrom > DASHBOARD_MIN_DATE ? customFrom : DASHBOARD_MIN_DATE}
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(clampDashboardDate(e.target.value))}
            />
          </label>
        </div>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Per-currency cash flow                                               */}
      {/* ------------------------------------------------------------------ */}
      {chartCurrencies.length === 0 ? (
        <p className="mt-10 text-[var(--muted)]">
          No income or expenses in this date range.
        </p>
      ) : (
        chartCurrencies.map((currency) => {
          const summary = summarizeCurrency(
            periodTransactions.filter((tx) => currencyOf(tx) === currency),
            categoryById,
          );
          const net = summary.incomeTotal - summary.expenseTotal;

          return (
            <section key={currency} className="mt-10">
              <h2 className="text-sm tracking-[0.14em] text-[var(--muted)] uppercase">
                {currency} cash flow · {rangeLabel}
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Everyday income and spending only. Transfers between your
                accounts, top-ups, and investing are kept separate below.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <SummaryCard label="Income">
                  <span className="text-[var(--up)]">
                    {formatMoney(summary.incomeTotal, currency)}
                  </span>
                </SummaryCard>
                <SummaryCard label="Expenses">
                  <span className="text-[var(--down)]">
                    {formatMoney(summary.expenseTotal, currency)}
                  </span>
                </SummaryCard>
                <SummaryCard emphasis label="Net" hint="Income minus expenses">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={netChangeColor(net)}>
                      {formatSignedMoney(net, currency)}
                    </span>
                    <NetChangeBadge amount={net} />
                  </span>
                </SummaryCard>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <BreakdownCard
                  currency={currency}
                  kind="expense"
                  rows={summary.expense}
                  title="Where the money went"
                  total={summary.expenseTotal}
                />
                <BreakdownCard
                  currency={currency}
                  kind="income"
                  rows={summary.income}
                  title="Where it came from"
                  total={summary.incomeTotal}
                />
              </div>

              {summary.movements.length > 0 ? (
                <MovementsPanel
                  currency={currency}
                  rows={summary.movements}
                />
              ) : null}
            </section>
          );
        })
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BreakdownCard
// ---------------------------------------------------------------------------

function BreakdownCard({
  title,
  kind,
  rows,
  total,
  currency,
}: {
  title: string;
  kind: "income" | "expense";
  rows: CategoryTotal[];
  total: number;
  currency: Currency;
}) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium text-[var(--ink)]">{title}</h3>
        <p className="shrink-0 text-sm text-[var(--muted)]">
          {rows.length} categor{rows.length === 1 ? "y" : "ies"}
        </p>
      </div>
      <CategoryDonut
        slices={toSlices(rows, currency)}
        palette={kind === "expense" ? EXPENSE_PALETTE : INCOME_PALETTE}
        emptyLabel={`No ${kind === "expense" ? "spending" : "income"} in this period.`}
        centerLabel={kind === "expense" ? "Spent" : "Earned"}
        totalDisplay={total > 0 ? formatMoney(total, currency) : undefined}
      />
    </article>
  );
}

// ---------------------------------------------------------------------------
// MovementsPanel
// ---------------------------------------------------------------------------

const MOVEMENT_GROUPS: {
  bucket: MovementRow["bucket"];
  label: string;
  hint: string;
}[] = [
  {
    bucket: "transfer",
    label: "Between your accounts",
    hint: "Fund placements and top-ups. What leaves one account lands in another.",
  },
  {
    bucket: "investing",
    label: "Investing",
    hint: "Money put into investments and the returns that came back.",
  },
];

function MovementsPanel({
  rows,
  currency,
}: {
  rows: MovementRow[];
  currency: Currency;
}) {
  const investingNet = rows
    .filter((row) => row.bucket === "investing")
    .reduce((total, row) => total + row.inAmount - row.outAmount, 0);
  const hasInvesting = rows.some((row) => row.bucket === "investing");

  return (
    <details className="group mt-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
        <div>
          <h3 className="font-medium text-[var(--ink)]">
            Transfers &amp; investing
          </h3>
          <p className="text-xs text-[var(--muted)]">
            Not counted in income or expenses above.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {hasInvesting ? (
            <span className="text-right text-sm">
              <span className="block text-xs text-[var(--muted)]">
                Investing net
              </span>
              <span className={netChangeColor(investingNet)}>
                {formatSignedMoney(investingNet, currency)}
              </span>
            </span>
          ) : null}
          <span
            aria-hidden="true"
            className="text-lg text-[var(--accent-strong)] transition group-open:rotate-90"
          >
            &gt;
          </span>
        </div>
      </summary>

      <div className="overflow-x-auto border-t border-[var(--line)]">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead className="text-[var(--muted)]">
            <tr>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 text-right font-medium">In</th>
              <th className="px-5 py-3 text-right font-medium">Out</th>
              <th className="px-5 py-3 text-right font-medium">Net</th>
            </tr>
          </thead>
          {MOVEMENT_GROUPS.map((group) => {
            const groupRows = rows.filter((row) => row.bucket === group.bucket);
            if (groupRows.length === 0) return null;

            return (
              <tbody key={group.bucket} className="tabular-nums">
                <tr className="border-t border-[var(--line)] bg-[var(--bg)]">
                  <td className="px-5 py-2" colSpan={4}>
                    <span className="text-xs font-medium tracking-wide text-[var(--ink)] uppercase">
                      {group.label}
                    </span>
                    <span className="ml-2 text-xs text-[var(--muted)]">
                      {group.hint}
                    </span>
                  </td>
                </tr>
                {groupRows.map((row) => {
                  const rowNet = row.inAmount - row.outAmount;
                  return (
                    <tr
                      key={row.name}
                      className="border-t border-[var(--line)]"
                    >
                      <td className="px-5 py-3">{row.name}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-[var(--up)]">
                        {row.inAmount ? formatMoney(row.inAmount, currency) : ""}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-[var(--down)]">
                        {row.outAmount
                          ? formatMoney(row.outAmount, currency)
                          : ""}
                      </td>
                      <td
                        className={`whitespace-nowrap px-5 py-3 text-right ${netChangeColor(rowNet)}`}
                      >
                        {rowNet === 0 ? "—" : formatSignedMoney(rowNet, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      </div>
    </details>
  );
}
