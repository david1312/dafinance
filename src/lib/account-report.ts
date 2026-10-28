import { DASHBOARD_MIN_DATE, isoDate, todayIso } from "@/lib/dashboard-range";
import type { Account, Category, Transaction } from "@/lib/types";

export const REPORT_MAX_MONTHS = 3;

export type ReportRow = {
  id: string;
  occurredOn: string;
  category: string;
  note: string | null;
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
      id: transaction.id,
      occurredOn: transaction.occurred_on,
      category,
      note: transaction.note,
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

export type OverviewRow = {
  account: Account;
  initialBalance: number;
  totalIn: number;
  totalOut: number;
  closingBalance: number;
  transactionCount: number;
};

export type OverviewCurrencyGroup = {
  currency: Account["currency"];
  rows: OverviewRow[];
  initialBalance: number;
  totalIn: number;
  totalOut: number;
  closingBalance: number;
};

export type AccountsOverview = {
  from: string;
  to: string;
  groups: OverviewCurrencyGroup[];
};

/**
 * Opening/closing balance for every account over [from, to]. Balances are in
 * each account's own currency, so totals are grouped per currency.
 */
export function buildAccountsOverview({
  accounts,
  transactions,
  from,
  to,
}: {
  accounts: Account[];
  transactions: Pick<
    Transaction,
    "account_id" | "amount" | "kind" | "occurred_on"
  >[];
  from: string;
  to: string;
}): AccountsOverview {
  const rowByAccount = new Map<string, OverviewRow>(
    accounts.map((account) => [
      account.id,
      {
        account,
        initialBalance: 0,
        totalIn: 0,
        totalOut: 0,
        closingBalance: 0,
        transactionCount: 0,
      },
    ]),
  );

  for (const transaction of transactions) {
    const row = rowByAccount.get(transaction.account_id);
    if (!row || transaction.occurred_on > to) continue;

    if (transaction.occurred_on < from) {
      row.initialBalance += signedAmount(transaction);
    } else {
      row.transactionCount += 1;
      if (transaction.kind === "income") row.totalIn += transaction.amount;
      else row.totalOut += transaction.amount;
    }
  }

  const groupByCurrency = new Map<Account["currency"], OverviewCurrencyGroup>();

  for (const row of rowByAccount.values()) {
    row.closingBalance = row.initialBalance + row.totalIn - row.totalOut;

    const currency = row.account.currency;
    const group = groupByCurrency.get(currency) ?? {
      currency,
      rows: [],
      initialBalance: 0,
      totalIn: 0,
      totalOut: 0,
      closingBalance: 0,
    };
    group.rows.push(row);
    group.initialBalance += row.initialBalance;
    group.totalIn += row.totalIn;
    group.totalOut += row.totalOut;
    group.closingBalance += row.closingBalance;
    groupByCurrency.set(currency, group);
  }

  const groups = [...groupByCurrency.values()]
    .map((group) => ({
      ...group,
      rows: group.rows.sort((a, b) =>
        a.account.name.localeCompare(b.account.name),
      ),
    }))
    .sort((a, b) => b.rows.length - a.rows.length);

  return { from, to, groups };
}

function formatDayLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

/** "1 Oct 2026, 00:00" — the moment the opening balance is taken. */
export function formatOpeningLabel(from: string) {
  return `${formatDayLabel(from)}, 00:00`;
}

/** "31 Oct 2026, 23:59", or "29 Oct 2026, so far" while the day is not over. */
export function formatClosingLabel(to: string) {
  return to >= todayIso()
    ? `${formatDayLabel(to)}, so far`
    : `${formatDayLabel(to)}, 23:59`;
}
