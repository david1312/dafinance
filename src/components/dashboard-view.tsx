"use client";

import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import Image from "next/image";
import { CategoryDonut, type DonutSlice } from "@/components/category-donut";
import { SearchableAccountSelect } from "@/components/searchable-account-select";
import {
  CURRENCIES,
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

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

const EXPENSE_PALETTE = [
  "#e4879f", "#f2a8bb", "#cf5f80", "#f7cdd8", "#b1697f", "#ff9db5", "#d98fa3",
];

const INCOME_PALETTE = [
  "#6fae8b", "#93c7a6", "#4f8f6c", "#bfe0cc", "#7fb9a2", "#5aa383", "#a8d4ba",
];

const UNCATEGORIZED = "__uncategorized__";

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

type SectionDef = {
  id: string;
  label: string;
  icon: string;
  /** Category name keywords (case-insensitive). Empty array = catch-all. */
  keywords: string[];
};

const EXPENSE_SECTIONS: SectionDef[] = [
  {
    id: "food-shopping",
    label: "Food, Groceries & Shopping",
    icon: "🛒",
    keywords: [
      "food", "grocer", "shopping", "market", "restaurant",
      "dining", "eat", "meal", "beverage", "drink", "cafe",
    ],
  },
  {
    id: "investment",
    label: "Investment & Fund Placement",
    icon: "📉",
    keywords: [
      "invest", "fund", "placement", "capital loss", "capital",
      "stock", "bond", "mutual", "reksadana",
    ],
  },
  {
    id: "reward-gift",
    label: "Self Reward & Gifts",
    icon: "🎁",
    keywords: [
      "reward", "gift", "hobby", "entertainment", "luxury",
      "beauty", "spa", "fashion", "clothing", "apparel",
    ],
  },
  {
    id: "housing",
    label: "Housing",
    icon: "🏠",
    keywords: [
      "housing", "mortgage", "property", "utility", "utilities",
      "electric", "water", "internet", "subscription",
    ],
  },
  {
    id: "transport-travel",
    label: "Transport & Travel",
    icon: "🚗",
    keywords: [
      "transport", "travel", "commute", "toll", "parking",
      "fuel", "petrol", "grab", "gojek", "taxi", "flight",
      "hotel", "trip", "train", "bus",
    ],
  },
  {
    id: "other-expense",
    label: "Other Expenses",
    icon: "📦",
    keywords: [],
  },
];

const INCOME_SECTIONS: SectionDef[] = [
  {
    id: "regular",
    label: "Salary, Rent & Freelance",
    icon: "💼",
    keywords: [
      "salary", "wage", "freelance", "cashback", "rental",
      "rent", "allowance", "bonus", "gaji",
    ],
  },
  {
    id: "investment-income",
    label: "Investment & Dividend",
    icon: "📈",
    keywords: [
      "inves", "dividend", "divident",
      "capital gain", "capital", "stock", "bond", "interest", "mutual", "reksadana",
    ],
  },
  {
    id: "other-income",
    label: "Other Income",
    icon: "💰",
    keywords: [],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSectionId(categoryName: string, sections: SectionDef[]): string {
  const name = categoryName.toLowerCase();
  for (const section of sections) {
    if (section.keywords.length === 0) continue;
    if (section.keywords.some((kw) => name.includes(kw.toLowerCase()))) {
      return section.id;
    }
  }
  // Last section is always the catch-all
  return sections[sections.length - 1].id;
}

function buildCategoriesBySection(
  categories: Category[],
  sections: SectionDef[],
): Record<string, Array<{ id: string; name: string }>> {
  const result: Record<string, Array<{ id: string; name: string }>> = {};
  for (const section of sections) result[section.id] = [];

  for (const cat of categories) {
    const sid = getSectionId(cat.name, sections);
    result[sid].push({ id: cat.id, name: cat.name });
  }

  // Always add "Uncategorized" chip to the catch-all section
  const catchAllId = sections[sections.length - 1].id;
  result[catchAllId].push({ id: UNCATEGORIZED, name: "Uncategorized" });

  return result;
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

  // Per-section chip selection: { [sectionId]: string[] of selected category IDs }
  // Empty array = "show all in section"
  const [expSel, setExpSel] = useState<Record<string, string[]>>({});
  const [incSel, setIncSel] = useState<Record<string, string[]>>({});

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

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.kind === "expense"),
    [categories],
  );
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.kind === "income"),
    [categories],
  );

  const expCatsBySection = useMemo(
    () => buildCategoriesBySection(expenseCategories, EXPENSE_SECTIONS),
    [expenseCategories],
  );
  const incCatsBySection = useMemo(
    () => buildCategoriesBySection(incomeCategories, INCOME_SECTIONS),
    [incomeCategories],
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

  // Compute donut slices for a given section, respecting per-section chip selection
  function slicesForSection(
    kind: "income" | "expense",
    currency: Currency,
    sectionCats: Array<{ id: string; name: string }>,
    selected: string[],
  ): DonutSlice[] {
    const allIds = sectionCats.map((c) => c.id);
    const activeIds = selected.length > 0 ? selected : allIds;

    const totals = periodTransactions
      .filter((tx) => {
        const catId = tx.category_id ?? UNCATEGORIZED;
        return (
          tx.kind === kind &&
          currencyOf(tx) === currency &&
          activeIds.includes(catId)
        );
      })
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
  }

  function toggleChip(
    sel: Record<string, string[]>,
    setSel: Dispatch<SetStateAction<Record<string, string[]>>>,
    sectionId: string,
    chipId: string,
  ) {
    const current = sel[sectionId] ?? [];
    const next = current.includes(chipId)
      ? current.filter((x) => x !== chipId)
      : [...current, chipId];
    setSel((prev) => ({ ...prev, [sectionId]: next }));
  }

  function clearSection(
    setSel: Dispatch<SetStateAction<Record<string, string[]>>>,
    sectionId: string,
  ) {
    setSel((prev) => ({ ...prev, [sectionId]: [] }));
  }

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
      {/* Per-currency section breakdown                                       */}
      {/* ------------------------------------------------------------------ */}
      {chartCurrencies.length === 0 ? (
        <p className="mt-10 text-[var(--muted)]">
          No income or expenses in this date range.
        </p>
      ) : (
        chartCurrencies.map((currency) => {
          const expenseTotal = periodTransactions
            .filter((tx) => tx.kind === "expense" && currencyOf(tx) === currency)
            .reduce((s, tx) => s + tx.amount, 0);
          const incomeTotal = periodTransactions
            .filter((tx) => tx.kind === "income" && currencyOf(tx) === currency)
            .reduce((s, tx) => s + tx.amount, 0);

          return (
            <section key={currency} className="mt-10">
              <h2 className="text-sm tracking-[0.14em] text-[var(--muted)] uppercase">
                {currency} · {rangeLabel}
              </h2>

              {/* ---- Expenses ---- */}
              {expenseTotal > 0 && (
                <div className="mt-5">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-medium text-[var(--ink)]">Expenses</h3>
                    <span className="text-sm text-[var(--down)]">
                      {formatMoney(expenseTotal, currency)} total
                    </span>
                  </div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    {EXPENSE_SECTIONS.map((section) => {
                      const sectionCats = expCatsBySection[section.id] ?? [];
                      if (sectionCats.length === 0) return null;
                      const selected = expSel[section.id] ?? [];
                      const slices = slicesForSection(
                        "expense",
                        currency,
                        sectionCats,
                        selected,
                      );
                      const sectionTotal = slices.reduce(
                        (s, sl) => s + sl.value,
                        0,
                      );
                      // Hide section if it has no activity and user hasn't manually filtered it
                      if (sectionTotal === 0 && selected.length === 0) return null;

                      return (
                        <SectionCard
                          key={section.id}
                          section={section}
                          kind="expense"
                          palette={EXPENSE_PALETTE}
                          sectionCategories={sectionCats}
                          selected={selected}
                          slices={slices}
                          sectionTotal={sectionTotal}
                          currency={currency}
                          onToggle={(id) =>
                            toggleChip(expSel, setExpSel, section.id, id)
                          }
                          onClear={() => clearSection(setExpSel, section.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ---- Income ---- */}
              {incomeTotal > 0 && (
                <div className="mt-8">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-medium text-[var(--ink)]">Income</h3>
                    <span className="text-sm text-[var(--up)]">
                      {formatMoney(incomeTotal, currency)} total
                    </span>
                  </div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    {INCOME_SECTIONS.map((section) => {
                      const sectionCats = incCatsBySection[section.id] ?? [];
                      if (sectionCats.length === 0) return null;
                      const selected = incSel[section.id] ?? [];
                      const slices = slicesForSection(
                        "income",
                        currency,
                        sectionCats,
                        selected,
                      );
                      const sectionTotal = slices.reduce(
                        (s, sl) => s + sl.value,
                        0,
                      );
                      if (sectionTotal === 0 && selected.length === 0) return null;

                      return (
                        <SectionCard
                          key={section.id}
                          section={section}
                          kind="income"
                          palette={INCOME_PALETTE}
                          sectionCategories={sectionCats}
                          selected={selected}
                          slices={slices}
                          sectionTotal={sectionTotal}
                          currency={currency}
                          onToggle={(id) =>
                            toggleChip(incSel, setIncSel, section.id, id)
                          }
                          onClear={() => clearSection(setIncSel, section.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionCard
// ---------------------------------------------------------------------------

function SectionCard({
  section,
  kind,
  palette,
  sectionCategories,
  selected,
  slices,
  sectionTotal,
  currency,
  onToggle,
  onClear,
}: {
  section: SectionDef;
  kind: "income" | "expense";
  palette: string[];
  sectionCategories: Array<{ id: string; name: string }>;
  selected: string[];
  slices: DonutSlice[];
  sectionTotal: number;
  currency: Currency;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const amountColorClass =
    kind === "expense" ? "text-[var(--down)]" : "text-[var(--up)]";

  const chipActiveClass =
    kind === "expense"
      ? "border-[var(--down)] bg-[var(--accent-soft)] text-[var(--down)]"
      : "border-[var(--up)] bg-[#edf8f1] text-[var(--up)]";

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
      {/* Header: icon + label + section total */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-base" aria-hidden="true">
            {section.icon}
          </span>
          <h4 className="truncate text-sm font-medium text-[var(--ink)]">
            {section.label}
          </h4>
        </div>
        {sectionTotal > 0 && (
          <p className={`shrink-0 text-sm font-medium ${amountColorClass}`}>
            {formatMoney(sectionTotal, currency)}
          </p>
        )}
      </div>

      {/* Category chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {sectionCategories.map((cat) => {
          const isActive = selected.length === 0 || selected.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onToggle(cat.id)}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                isActive
                  ? chipActiveClass
                  : "border-[var(--line)] text-[var(--muted)]"
              } ${selected.length > 0 && !isActive ? "opacity-40" : ""}`}
            >
              {cat.name}
            </button>
          );
        })}
        {selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-dashed border-[var(--accent-strong)] px-2.5 py-1 text-xs text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
          >
            Show all
          </button>
        )}
      </div>

      {/* Donut chart */}
      <CategoryDonut
        slices={slices}
        palette={palette}
        emptyLabel={`No ${currency} ${kind} for selected categories.`}
        centerLabel={`${currency} ${kind}`}
        totalDisplay={
          sectionTotal > 0 ? formatMoney(sectionTotal, currency) : undefined
        }
      />
    </article>
  );
}
