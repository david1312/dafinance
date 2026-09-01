"use client";

import { useMemo, useState } from "react";
import { CategoryDonut, type DonutSlice } from "@/components/category-donut";
import { Modal } from "@/components/modal";
import {
  CURRENCIES,
  accountKindLabel,
  formatMoney,
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

const UNCATEGORIZED = "__uncategorized__";

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
  const [expenseIds, setExpenseIds] = useState<string[]>([]);
  const [incomeIds, setIncomeIds] = useState<string[]>([]);
  const [openCurrency, setOpenCurrency] = useState<Currency | null>(null);

  const { from, to } = rangeForPreset(preset, customFrom, customTo);
  const rangeLabel = formatRangeLabel(from, to);
  const maxDate = todayIso();

  const accountById = useMemo(
    () => Object.fromEntries(accounts.map((account) => [account.id, account])),
    [accounts],
  );
  const categoryById = useMemo(
    () =>
      Object.fromEntries(categories.map((category) => [category.id, category])),
    [categories],
  );

  const expenseCategories = categories.filter(
    (category) => category.kind === "expense",
  );
  const incomeCategories = categories.filter(
    (category) => category.kind === "income",
  );

  const periodTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        inDateRange(transaction.occurred_on, from, to),
      ),
    [from, to, transactions],
  );

  const netWorthTransactions = useMemo(
    () =>
      transactions.filter((transaction) => transaction.occurred_on <= to),
    [to, transactions],
  );

  const netByCurrency = CURRENCIES.map((currency) => {
    const currencyAccounts = accounts.filter(
      (account) => account.currency === currency,
    );
    const ids = currencyAccounts.map((account) => account.id);
    const balance = netWorthTransactions
      .filter((transaction) => ids.includes(transaction.account_id))
      .reduce(
        (sum, transaction) =>
          sum +
          (transaction.kind === "income"
            ? transaction.amount
            : -transaction.amount),
        0,
      );

    return { currency, balance, accounts: currencyAccounts };
  }).filter((row) => row.accounts.length > 0);

  const currencyOf = (transaction: Transaction): Currency =>
    accountById[transaction.account_id]?.currency ?? "IDR";

  const matchesCategory = (
    transaction: Transaction,
    selected: string[],
  ) => {
    if (selected.length === 0) return true;
    const id = transaction.category_id ?? UNCATEGORIZED;
    return selected.includes(id);
  };

  const slicesFor = (
    kind: "income" | "expense",
    currency: Currency,
    selected: string[],
  ): DonutSlice[] => {
    const totals = periodTransactions
      .filter(
        (transaction) =>
          transaction.kind === kind &&
          currencyOf(transaction) === currency &&
          matchesCategory(transaction, selected),
      )
      .reduce<Record<string, number>>((acc, transaction) => {
        const label = transaction.category_id
          ? (categoryById[transaction.category_id]?.name ?? "Uncategorized")
          : "Uncategorized";
        acc[label] = (acc[label] ?? 0) + transaction.amount;
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
    periodTransactions.some(
      (transaction) => currencyOf(transaction) === currency,
    ),
  );

  const openAccounts =
    netByCurrency.find((row) => row.currency === openCurrency)?.accounts ?? [];

  return (
    <div>
      <h1 className="text-4xl" style={{ fontFamily: "var(--font-display)" }}>
        {preset === "custom" ? "Custom range" : RANGE_PRESETS.find((item) => item.id === preset)?.label}
      </h1>
      <p className="mt-1 text-[var(--muted)]">
        {rangeLabel}. Amounts stay in each account&rsquo;s own currency.
      </p>

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
              onChange={(event) =>
                setCustomFrom(clampDashboardDate(event.target.value))
              }
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
              onChange={(event) =>
                setCustomTo(clampDashboardDate(event.target.value))
              }
            />
          </label>
        </div>
      ) : null}

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
              <article
                key={row.currency}
                className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5"
              >
                <p className="text-sm text-[var(--muted)]">{row.currency}</p>
                <p className="mt-2 text-2xl">
                  {formatMoney(row.balance, row.currency)}
                </p>
                <button
                  className="mt-1 text-left text-xs text-[var(--accent-strong)] underline-offset-2 hover:underline"
                  type="button"
                  onClick={() => setOpenCurrency(row.currency)}
                >
                  {row.accounts.length} account
                  {row.accounts.length > 1 ? "s" : ""}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <CategoryFilter
          kind="expense"
          categories={expenseCategories}
          selected={expenseIds}
          onChange={setExpenseIds}
        />
        <CategoryFilter
          kind="income"
          categories={incomeCategories}
          selected={incomeIds}
          onChange={setIncomeIds}
        />
      </section>

      {chartCurrencies.length === 0 ? (
        <p className="mt-10 text-[var(--muted)]">
          No income or expenses in this date range.
        </p>
      ) : (
        chartCurrencies.map((currency) => {
          const expenseSlices = slicesFor("expense", currency, expenseIds);
          const incomeSlices = slicesFor("income", currency, incomeIds);
          const expenseTotal = expenseSlices.reduce(
            (sum, slice) => sum + slice.value,
            0,
          );
          const incomeTotal = incomeSlices.reduce(
            (sum, slice) => sum + slice.value,
            0,
          );

          return (
            <section key={currency} className="mt-10">
              <h2 className="text-sm tracking-[0.14em] text-[var(--muted)] uppercase">
                {currency} · {rangeLabel}
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
                    emptyLabel={`No ${currency} expenses in this range.`}
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
                    emptyLabel={`No ${currency} income in this range.`}
                    centerLabel={`${currency} income`}
                    totalDisplay={formatMoney(incomeTotal, currency)}
                  />
                </article>
              </div>
            </section>
          );
        })
      )}

      {openCurrency ? (
        <Modal
          title={`${openCurrency} accounts`}
          onClose={() => setOpenCurrency(null)}
        >
          <ul className="space-y-3">
            {openAccounts.map((account) => {
              const balance = netWorthTransactions
                .filter((transaction) => transaction.account_id === account.id)
                .reduce(
                  (sum, transaction) =>
                    sum +
                    (transaction.kind === "income"
                      ? transaction.amount
                      : -transaction.amount),
                  0,
                );

              return (
                <li
                  key={account.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--line)] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate">{account.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {accountKindLabel(account.kind)}
                    </p>
                  </div>
                  <p className="shrink-0">{formatMoney(balance, account.currency)}</p>
                </li>
              );
            })}
          </ul>
        </Modal>
      ) : null}
    </div>
  );
}

function CategoryFilter({
  kind,
  categories,
  selected,
  onChange,
}: {
  kind: "income" | "expense";
  categories: Category[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const options = [
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
    })),
    { id: UNCATEGORIZED, name: "Uncategorized" },
  ];

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm capitalize text-[var(--muted)]">
          Filter {kind}
        </h2>
        {selected.length > 0 ? (
          <button
            className="text-xs text-[var(--accent-strong)]"
            type="button"
            onClick={() => onChange([])}
          >
            Show all
          </button>
        ) : null}
      </div>
      <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
        {options.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                active || selected.length === 0
                  ? kind === "expense"
                    ? "border-[var(--down)] bg-[var(--accent-soft)] text-[var(--down)]"
                    : "border-[var(--up)] bg-[#edf8f1] text-[var(--up)]"
                  : "border-[var(--line)] text-[var(--muted)]"
              } ${selected.length > 0 && !active ? "opacity-45" : ""}`}
              type="button"
              onClick={() => toggle(option.id)}
            >
              {option.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
