"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { AccountStatementView } from "@/components/account-statement-view";
import { AccountsOverviewView } from "@/components/accounts-overview-view";
import { SearchableAccountSelect } from "@/components/searchable-account-select";
import { Spinner } from "@/components/spinner";
import { createClient } from "@/lib/supabase/client";
import {
  openAccountReportPdf,
  openAccountsOverviewPdf,
} from "@/lib/account-report-pdf";
import {
  REPORT_MAX_MONTHS,
  allTimeMonths,
  buildAccountReport,
  buildAccountsOverview,
  clampReportMonths,
  currentMonthValue,
  lastCompleteMonth,
  lastNMonths,
  minMonthValue,
  monthEnd,
  monthSpan,
  monthStart,
  type AccountReport,
  type AccountsOverview,
} from "@/lib/account-report";
import type { Account, Category, Transaction } from "@/lib/types";

const fieldClass =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

const primaryButtonClass =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-strong)] px-4 py-2.5 font-medium text-[var(--on-accent)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto";

const secondaryButtonClass =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 font-medium text-[var(--accent-strong)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto";

const PAGE_SIZE = 1000;

type Mode = "statement" | "overview";
type Action = "view" | "pdf" | "overview" | "overview-pdf";

const PERIOD_PRESETS = [
  { id: "this_month", label: "This month", months: () => lastNMonths(1) },
  { id: "last_month", label: "Last month", months: lastCompleteMonth },
  { id: "last_3_months", label: "Last 3 months", months: () => lastNMonths(3) },
  { id: "all_time", label: "All time", months: allTimeMonths },
] as const;

type PeriodPreset = (typeof PERIOD_PRESETS)[number]["id"] | "custom";

const MODES: { id: Mode; label: string; description: string }[] = [
  {
    id: "statement",
    label: "Account statement",
    description:
      "Opening and closing balance for one account, with every transaction in between.",
  },
  {
    id: "overview",
    label: "All accounts overview",
    description:
      "Opening balance, closing balance, and net change for every account side by side.",
  },
];

async function fetchAll(
  buildQuery: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
) {
  const rows: unknown[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await buildQuery(from, to);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function loadAccountReport(
  account: Account,
  categories: Category[],
  from: string,
  to: string,
) {
  const supabase = createClient();

  const priorRows = (await fetchAll((rangeFrom, rangeTo) =>
    supabase
      .from("transactions")
      .select("amount, kind")
      .eq("account_id", account.id)
      .is("deleted_at", null)
      .lt("occurred_on", from)
      .order("id", { ascending: true })
      .range(rangeFrom, rangeTo),
  )) as Pick<Transaction, "amount" | "kind">[];

  const periodRows = (await fetchAll((rangeFrom, rangeTo) =>
    supabase
      .from("transactions")
      .select("*")
      .eq("account_id", account.id)
      .is("deleted_at", null)
      .gte("occurred_on", from)
      .lte("occurred_on", to)
      .order("occurred_on", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(rangeFrom, rangeTo),
  )) as Transaction[];

  return buildAccountReport({
    account,
    categories,
    priorTransactions: priorRows.map((row) => ({
      amount: Number(row.amount),
      kind: row.kind,
    })),
    periodTransactions: periodRows.map((row) => ({
      ...row,
      amount: Number(row.amount),
    })),
    from,
    to,
  });
}

async function loadAccountsOverview(
  accounts: Account[],
  from: string,
  to: string,
) {
  const supabase = createClient();

  const rows = (await fetchAll((rangeFrom, rangeTo) =>
    supabase
      .from("transactions")
      .select("account_id, amount, kind, occurred_on")
      .is("deleted_at", null)
      .lte("occurred_on", to)
      .order("id", { ascending: true })
      .range(rangeFrom, rangeTo),
  )) as Pick<Transaction, "account_id" | "amount" | "kind" | "occurred_on">[];

  return buildAccountsOverview({
    accounts,
    transactions: rows.map((row) => ({ ...row, amount: Number(row.amount) })),
    from,
    to,
  });
}

export function ReportBuilder({
  accounts,
  categories,
}: {
  accounts: Account[];
  categories: Category[];
}) {
  const defaultMonths = lastNMonths(1);
  const [mode, setMode] = useState<Mode>("statement");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  // Bumped when the account is picked from the overview, so the
  // uncontrolled account select remounts with the new value.
  const [accountSelectKey, setAccountSelectKey] = useState(0);
  const [period, setPeriod] = useState<PeriodPreset>("this_month");
  const [fromMonth, setFromMonth] = useState(defaultMonths.fromMonth);
  const [toMonth, setToMonth] = useState(defaultMonths.toMonth);
  const [error, setError] = useState<string | null>(null);
  const [statement, setStatement] = useState<AccountReport | null>(null);
  const [overview, setOverview] = useState<AccountsOverview | null>(null);
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [isPending, startTransition] = useTransition();
  const resultRef = useRef<HTMLDivElement>(null);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId) ?? null,
    [accountId, accounts],
  );

  const span = monthSpan(fromMonth, toMonth);
  const activeMode = MODES.find((item) => item.id === mode) ?? MODES[0];

  const allTime = period === "all_time";

  function applyMonths(nextFrom: string, nextTo: string) {
    const clamped = clampReportMonths(nextFrom, nextTo);
    setPeriod("custom");
    setFromMonth(clamped.fromMonth);
    setToMonth(clamped.toMonth);
  }

  function selectPreset(preset: (typeof PERIOD_PRESETS)[number]) {
    const months = preset.months();
    setPeriod(preset.id);
    setFromMonth(months.fromMonth);
    setToMonth(months.toMonth);
  }

  function run(action: Action, account: Account | null = selectedAccount) {
    const isOverview = action === "overview" || action === "overview-pdf";
    if (!isOverview && !account) {
      setError("Select an account first.");
      return;
    }
    if (!allTime && span > REPORT_MAX_MONTHS) {
      setError(`Period cannot be longer than ${REPORT_MAX_MONTHS} months.`);
      return;
    }

    const from = monthStart(fromMonth);
    const to = monthEnd(toMonth);

    setPendingAction(action);
    startTransition(async () => {
      setError(null);
      try {
        if (isOverview) {
          const result = await loadAccountsOverview(accounts, from, to);
          setOverview(result);
          if (action === "overview-pdf") {
            openAccountsOverviewPdf(result);
            return;
          }
        } else if (account) {
          const report = await loadAccountReport(account, categories, from, to);
          if (action === "pdf") {
            openAccountReportPdf(report);
            return;
          }
          setStatement(report);
        }
        requestAnimationFrame(() =>
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        );
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not generate the report.",
        );
      } finally {
        setPendingAction(null);
      }
    });
  }

  function openAccountStatement(account: Account) {
    setMode("statement");
    setAccountId(account.id);
    setAccountSelectKey((key) => key + 1);
    run("view", account);
  }

  if (accounts.length === 0) {
    return (
      <p className="mt-8 text-[var(--muted)]">
        Add an account first, then come back to generate a statement.
      </p>
    );
  }

  const busyLabel = (action: Action, idle: string, busy: string) =>
    isPending && pendingAction === action ? (
      <>
        <Spinner />
        {busy}
      </>
    ) : (
      idle
    );

  return (
    <>
      <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <div
          aria-label="Report type"
          className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--accent-soft)] p-1"
          role="tablist"
        >
          {MODES.map((item) => (
            <button
              key={item.id}
              aria-selected={mode === item.id}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === item.id
                  ? "bg-[var(--paper)] text-[var(--accent-strong)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              role="tab"
              type="button"
              onClick={() => {
                setMode(item.id);
                setError(null);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">
          {activeMode.description}
        </p>

        <div className="mt-5 grid gap-4">
          {mode === "statement" ? (
            <label className="grid gap-1 text-sm text-[var(--muted)]">
              Account
              <SearchableAccountSelect
                key={accountSelectKey}
                accounts={accounts}
                defaultValue={accountId}
                name="report-account"
                onChange={setAccountId}
              />
            </label>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {PERIOD_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  period === preset.id
                    ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)]"
                }`}
                type="button"
                onClick={() => selectPreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-[var(--muted)]">
              From month
              <input
                className={fieldClass}
                max={toMonth}
                min={minMonthValue()}
                type="month"
                value={fromMonth}
                onChange={(event) => applyMonths(event.target.value, toMonth)}
              />
            </label>
            <label className="grid gap-1 text-sm text-[var(--muted)]">
              To month
              <input
                className={fieldClass}
                max={currentMonthValue()}
                min={fromMonth}
                type="month"
                value={toMonth}
                onChange={(event) => applyMonths(fromMonth, event.target.value)}
              />
            </label>
          </div>

          <p className="text-xs text-[var(--muted)]">
            {allTime
              ? `All time: every month since tracking started (${span} month${span > 1 ? "s" : ""}).`
              : `${span} month${span > 1 ? "s" : ""} selected. Maximum is ${REPORT_MAX_MONTHS} months, or pick All time.`}{" "}
            Opening balance is taken at 00:00 on the first day, closing balance
            at 23:59 on the last day.
          </p>

          {error ? <p className="text-sm text-[var(--down)]">{error}</p> : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            {mode === "statement" ? (
              <>
                <button
                  className={primaryButtonClass}
                  disabled={isPending}
                  type="button"
                  onClick={() => run("view")}
                >
                  {busyLabel("view", "View statement", "Loading…")}
                </button>
                <button
                  className={secondaryButtonClass}
                  disabled={isPending}
                  type="button"
                  onClick={() => run("pdf")}
                >
                  {busyLabel("pdf", "Download PDF", "Generating…")}
                </button>
              </>
            ) : (
              <>
                <button
                  className={primaryButtonClass}
                  disabled={isPending}
                  type="button"
                  onClick={() => run("overview")}
                >
                  {busyLabel("overview", "View overview", "Loading…")}
                </button>
                <button
                  className={secondaryButtonClass}
                  disabled={isPending}
                  type="button"
                  onClick={() => run("overview-pdf")}
                >
                  {busyLabel("overview-pdf", "Download PDF", "Generating…")}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <div ref={resultRef} className="scroll-mt-6">
        {mode === "statement" && statement ? (
          <AccountStatementView report={statement} />
        ) : null}
        {mode === "overview" && overview ? (
          <AccountsOverviewView
            overview={overview}
            onOpenAccount={openAccountStatement}
          />
        ) : null}
      </div>
    </>
  );
}
