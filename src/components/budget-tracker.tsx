"use client";

import { useMemo } from "react";
import { SummaryCard } from "@/components/report-summary";
import {
  BUDGETS,
  BUDGET_CURRENCY,
  budgetFor,
  budgetPeriod,
  type Budget,
} from "@/lib/budgets";
import { categoryBucket } from "@/lib/category-buckets";
import { formatMoney, type Currency } from "@/lib/currencies";
import {
  formatRangeLabel,
  inDateRange,
  todayIso,
} from "@/lib/dashboard-range";
import { makeConverter, type DailyRates } from "@/lib/fx";
import type { RateRow } from "@/lib/money";
import type { Account, Category, Transaction } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Whole yen: sen from currency conversion are noise in a budget. */
const budgetMoney = (amount: number) =>
  formatMoney(Math.round(amount), BUDGET_CURRENCY, 0);

/** One category's spending in one currency, plus its budget-currency value. */
type SpendPart = {
  category: string;
  currency: Currency;
  amount: number;
  converted: number;
};

type BudgetSpend = { spent: number; parts: SpendPart[] };

// ---------------------------------------------------------------------------
// BudgetTracker
// ---------------------------------------------------------------------------

type BudgetTrackerProps = {
  from: string;
  to: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  dailyRates: DailyRates | null;
  manualRates: RateRow[];
};

export function BudgetTracker({
  from,
  to,
  accounts,
  categories,
  transactions,
  dailyRates,
  manualRates,
}: BudgetTrackerProps) {

  const { byBudget, unbudgeted, unconvertible } = useMemo(() => {
    const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]));
    const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
    const convert = makeConverter(BUDGET_CURRENCY, dailyRates, manualRates);

    const spends: Record<string, Record<string, SpendPart>> = {};
    const missing = new Set<Currency>();

    for (const tx of transactions) {
      if (tx.kind !== "expense" || !inDateRange(tx.occurred_on, from, to)) {
        continue;
      }
      const category = tx.category_id ? categoryById[tx.category_id] : undefined;
      // Fund placements, top-ups and investing aren't spending.
      if (categoryBucket(category) !== "everyday") continue;

      const currency: Currency = accountById[tx.account_id]?.currency ?? "IDR";
      const converted = convert(tx.amount, currency, tx.occurred_on);
      if (converted === null) {
        missing.add(currency);
        continue;
      }

      const key = budgetFor(category)?.id ?? "";
      const name = category?.name ?? "Uncategorized";
      const part = ((spends[key] ??= {})[`${name}|${currency}`] ??= {
        category: name,
        currency,
        amount: 0,
        converted: 0,
      });
      part.amount += tx.amount;
      part.converted += converted;
    }

    const toSpend = (parts: Record<string, SpendPart> = {}): BudgetSpend => {
      const list = Object.values(parts).sort((a, b) => b.converted - a.converted);
      return {
        spent: list.reduce((total, part) => total + part.converted, 0),
        parts: list,
      };
    };

    return {
      byBudget: Object.fromEntries(
        BUDGETS.map((budget) => [budget.id, toSpend(spends[budget.id])]),
      ),
      unbudgeted: toSpend(spends[""]),
      unconvertible: [...missing],
    };
  }, [accounts, categories, dailyRates, from, manualRates, to, transactions]);

  const { months, elapsed, daysLeft } = budgetPeriod(from, to, todayIso());
  const totalBudget = BUDGETS.reduce(
    (total, budget) => total + budget.amount * months,
    0,
  );
  const totalSpent = BUDGETS.reduce(
    (total, budget) => total + byBudget[budget.id].spent,
    0,
  );
  const totalLeft = totalBudget - totalSpent;
  // Pace only means something while a month in the range is still running.
  const pace = daysLeft > 0 ? elapsed / months : undefined;
  const monthCount = Number(months.toFixed(2));

  return (
    <section className="mt-8">
      <h2 className="text-sm tracking-[0.14em] text-[var(--muted)] uppercase">
        Budget · {formatRangeLabel(from, to)}
      </h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Monthly budgets in {BUDGET_CURRENCY}, scaled to the selected range and
        covering the whole household.{" "}
        {dailyRates
          ? "Other currencies are converted at the ECB rate on each transaction’s date."
          : "Live rates are unavailable, so other currencies use your saved rates in Settings."}
        {unconvertible.length > 0
          ? ` No rate for ${unconvertible.join(", ")}, so that spending is left out.`
          : ""}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Budget"
          footer={`${monthCount} month${monthCount === 1 ? "" : "s"} of budget`}
        >
          {budgetMoney(totalBudget)}
        </SummaryCard>
        <SummaryCard label="Spent">
          <span className="text-[var(--down)]">{budgetMoney(totalSpent)}</span>
        </SummaryCard>
        <SummaryCard
          emphasis
          label={totalLeft < 0 ? "Over budget" : "Left"}
          footer={
            daysLeft > 0 && totalLeft > 0
              ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left · about ${budgetMoney(totalLeft / daysLeft)} a day`
              : undefined
          }
        >
          <span
            className={totalLeft < 0 ? "text-[var(--down)]" : "text-[var(--up)]"}
          >
            {budgetMoney(Math.abs(totalLeft))}
          </span>
        </SummaryCard>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BUDGETS.map((budget) => (
          <BudgetCard
            key={budget.id}
            amount={budget.amount * months}
            budget={budget}
            pace={pace}
            spend={byBudget[budget.id]}
          />
        ))}
        {unbudgeted.parts.length > 0 ? (
          <article className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--paper)] p-5">
            <h3 className="font-medium text-[var(--ink)]">Not in a budget</h3>
            <p className="mt-2 text-2xl tabular-nums">
              {budgetMoney(unbudgeted.spent)}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Everyday spending whose category doesn&rsquo;t match any budget.
            </p>
            <SpendParts parts={unbudgeted.parts} />
          </article>
        ) : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// BudgetCard
// ---------------------------------------------------------------------------

function BudgetCard({
  budget,
  amount,
  spend,
  pace,
}: {
  budget: Budget;
  /** The monthly budget scaled to the selected range. */
  amount: number;
  spend: BudgetSpend;
  /** Share of the budget period gone, while a month is in progress. */
  pace?: number;
}) {
  const left = amount - spend.spent;
  const share = amount > 0 ? spend.spent / amount : 0;
  const over = left < 0;
  const status = over
    ? { label: "Over budget", className: "bg-[var(--accent-soft)] text-[var(--down)]" }
    : pace !== undefined && share > pace
      ? { label: "Ahead of pace", className: "bg-[#fdf3e3] text-[#9a6412]" }
      : { label: "On track", className: "bg-[#e7f4ec] text-[var(--up)]" };

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-[var(--ink)]">{budget.label}</h3>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <p className="mt-2 text-2xl tabular-nums">
        <span className={over ? "text-[var(--down)]" : undefined}>
          {budgetMoney(Math.abs(left))}
        </span>{" "}
        <span className="text-sm text-[var(--muted)]">
          {over ? "over" : "left"}
        </span>
      </p>

      <div
        aria-label={`${Math.round(share * 100)}% of budget spent`}
        className="relative mt-3 h-2 rounded-full bg-[var(--bg)] ring-1 ring-[var(--line)]"
        role="img"
      >
        <div
          className={`h-full rounded-full ${over ? "bg-[var(--down)]" : "bg-[var(--accent)]"}`}
          style={{ width: `${Math.min(share, 1) * 100}%` }}
        />
        {pace !== undefined ? (
          <div
            className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-[var(--ink)] opacity-40"
            style={{ left: `${pace * 100}%` }}
            title="Where you'd be spending evenly through the period"
          />
        ) : null}
      </div>

      <p className="mt-2 text-xs text-[var(--muted)] tabular-nums">
        {budgetMoney(spend.spent)} of {budgetMoney(amount)} ·{" "}
        {Math.round(share * 100)}%
      </p>

      {spend.parts.length > 0 ? <SpendParts parts={spend.parts} /> : null}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function SpendParts({ parts }: { parts: SpendPart[] }) {
  return (
    <details className="group mt-3 border-t border-[var(--line)] pt-3">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-[var(--muted)]">
        <span>
          {parts.length} categor{parts.length === 1 ? "y" : "ies"}
        </span>
        <span
          aria-hidden="true"
          className="text-[var(--accent-strong)] transition group-open:rotate-90"
        >
          &gt;
        </span>
      </summary>
      <ul className="mt-2 space-y-1.5">
        {parts.map((part) => (
          <li
            key={`${part.category}|${part.currency}`}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <span className="truncate">{part.category}</span>
            <span className="shrink-0 text-right tabular-nums text-[var(--muted)]">
              {part.currency === BUDGET_CURRENCY
                ? budgetMoney(part.amount)
                : `${formatMoney(part.amount, part.currency)} ≈ ${budgetMoney(part.converted)}`}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
