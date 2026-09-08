import { DASHBOARD_MIN_DATE, isoDate, todayIso } from "@/lib/dashboard-range";
import type { Account, Category, Transaction } from "@/lib/types";

export const REPORT_MAX_MONTHS = 3;

export type ReportRow = {
  occurredOn: string;
  description: string;
  kind: "income" | "expense";
  inAmount: number;
  outAmount: number;
  balance: number;
};

export type AccountReport = {
  account: Account;
  from: string;
  to: string;
  initialBalance: number;
  closingBalance: number;
  totalIn: number;
  totalOut: number;
  rows: ReportRow[];
};

export function currentMonthValue() {
  return todayIso().slice(0, 7);
}

export function minMonthValue() {
  return DASHBOARD_MIN_DATE.slice(0, 7);
}

export function monthStart(month: string) {
  const start = `${month}-01`;
  return start < DASHBOARD_MIN_DATE ? DASHBOARD_MIN_DATE : start;
}

export function monthEnd(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = isoDate(new Date(year, monthNumber, 0));
  const today = todayIso();
  return lastDay > today ? today : lastDay;
}

export function monthSpan(fromMonth: string, toMonth: string) {
  const [fromYear, fromNumber] = fromMonth.split("-").map(Number);
  const [toYear, toNumber] = toMonth.split("-").map(Number);
  return (toYear - fromYear) * 12 + (toNumber - fromNumber) + 1;
}

export function clampReportMonths(fromMonth: string, toMonth: string) {
  const minMonth = minMonthValue();
  const maxMonth = currentMonthValue();
  let from = fromMonth < minMonth ? minMonth : fromMonth;
  let to = toMonth > maxMonth ? maxMonth : toMonth;
  if (from > to) from = to;
  if (monthSpan(from, to) > REPORT_MAX_MONTHS) {
    const [year, month] = from.split("-").map(Number);
    const limited = new Date(year, month - 1 + REPORT_MAX_MONTHS - 1, 1);
    to = isoDate(limited).slice(0, 7);
    if (to > maxMonth) to = maxMonth;
  }
  return { fromMonth: from, toMonth: to };
}

export function lastNMonths(count: number) {
  const end = currentMonthValue();
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
  const start = isoDate(startDate).slice(0, 7);
  return clampReportMonths(start, end);
}

export function lastCompleteMonth() {
  const now = new Date();
  const previous = isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(
    0,
    7,
  );
  return clampReportMonths(previous, previous);
}

export function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
}

export function formatPeriodLabel(from: string, to: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const start = formatter.format(new Date(`${from}T00:00:00Z`));
  const end = formatter.format(new Date(`${to}T00:00:00Z`));
  return `${start} – ${end}`;
}

function signedAmount(transaction: Pick<Transaction, "amount" | "kind">) {
  return transaction.kind === "income"
    ? transaction.amount
    : -transaction.amount;
}

export function buildAccountReport({
  account,
  categories,
  priorTransactions,
  periodTransactions,
  from,
  to,
}: {
  account: Account;
  categories: Category[];
  priorTransactions: Pick<Transaction, "amount" | "kind">[];
  periodTransactions: Transaction[];
  from: string;
  to: string;
}): AccountReport {
  const categoryById = Object.fromEntries(
    categories.map((category) => [category.id, category.name]),
  );

  const initialBalance = priorTransactions.reduce(
    (sum, transaction) => sum + signedAmount(transaction),
    0,
  );

  let running = initialBalance;
  let totalIn = 0;
  let totalOut = 0;

  const rows = periodTransactions.map((transaction) => {
    const inAmount = transaction.kind === "income" ? transaction.amount : 0;
    const outAmount = transaction.kind === "expense" ? transaction.amount : 0;
    running += signedAmount(transaction);
    totalIn += inAmount;
    totalOut += outAmount;

    const category = transaction.category_id
      ? (categoryById[transaction.category_id] ?? "Uncategorized")
      : "Uncategorized";
    const description = transaction.note
      ? `${category} · ${transaction.note}`
      : category;

    return {
      occurredOn: transaction.occurred_on,
      description,
      kind: transaction.kind,
      inAmount,
      outAmount,
      balance: running,
    };
  });

  return {
    account,
    from,
    to,
    initialBalance,
    closingBalance: running,
    totalIn,
    totalOut,
    rows,
  };
}
