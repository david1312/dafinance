import type { Currency } from "./currencies";
import type { Category } from "./types";

/** Budgets are set in yen; spending in other currencies is converted. */
export const BUDGET_CURRENCY: Currency = "JPY";

export type Budget = {
  id: string;
  label: string;
  /** Per calendar month, in BUDGET_CURRENCY. */
  amount: number;
  /**
   * Expense categories whose name contains any of these count toward the
   * budget; the first matching budget wins.
   */
  keywords: string[];
};

export const BUDGETS: Budget[] = [
  {
    id: "food",
    label: "Food & groceries",
    amount: 120_000,
    keywords: ["food", "grocer", "supermarket", "makan"],
  },
  {
    id: "rent",
    label: "Rent",
    amount: 133_000,
    keywords: ["rent", "housing", "sewa"],
  },
  {
    id: "self_reward",
    label: "Self reward & entertainment",
    amount: 40_000,
    keywords: ["reward", "entertain", "hobby", "leisure"],
  },
  {
    id: "transport",
    label: "Transport",
    amount: 15_000,
    keywords: ["transport", "travel", "commute", "train"],
  },
];

function daysInMonth(month: string) {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index, 0)).getUTCDate();
}

function nextMonth(month: string) {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index, 1)).toISOString().slice(0, 7);
}

/**
 * How many months of budget a date range is worth. Each calendar month it
 * touches counts by the share of days covered, except the month in progress:
 * a range from its 1st up to today gets the whole month, so "This month"
 * shows what's left until month end.
 *
 *  - months:   multiplier for the monthly budgets (Last 3 months → 3)
 *  - elapsed:  how much of that has already passed, for the pace marker
 *  - daysLeft: days remaining in the month in progress, including today
 */
export function budgetPeriod(from: string, to: string, today: string) {
  let months = 0;
  let elapsed = 0;
  let daysLeft = 0;

  for (let month = from.slice(0, 7); month <= to.slice(0, 7); month = nextMonth(month)) {
    const days = daysInMonth(month);
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-${String(days).padStart(2, "0")}`;
    const start = from > monthStart ? from : monthStart;
    const end = to < monthEnd ? to : monthEnd;
    const covered = (Date.parse(end) - Date.parse(start)) / 864e5 + 1;

    if (start === monthStart && end === today && today < monthEnd) {
      months += 1;
      elapsed += covered / days;
      daysLeft = days - covered + 1;
    } else {
      months += covered / days;
      elapsed += covered / days;
    }
  }

  return { months, elapsed, daysLeft };
}

export function budgetFor(
  category: Pick<Category, "name"> | null | undefined,
): Budget | undefined {
  if (!category) return undefined;
  const name = category.name.toLowerCase();
  return BUDGETS.find((budget) =>
    budget.keywords.some((keyword) => name.includes(keyword)),
  );
}
