"use client";

import { useMemo, useState, useTransition } from "react";
import { SearchableAccountSelect } from "@/components/searchable-account-select";
import { Spinner } from "@/components/spinner";
import { createClient } from "@/lib/supabase/client";
import { buildAccountReport } from "@/lib/account-report";
import { openAccountReportPdf } from "@/lib/account-report-pdf";
import {
  REPORT_MAX_MONTHS,
  clampReportMonths,
  currentMonthValue,
  lastCompleteMonth,
  lastNMonths,
  minMonthValue,
  monthEnd,
  monthSpan,
  monthStart,
} from "@/lib/account-report";
import type { Account, Category, Transaction } from "@/lib/types";

const fieldClass =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

const PAGE_SIZE = 1000;

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

export function ReportBuilder({
  accounts,
  categories,
}: {
  accounts: Account[];
  categories: Category[];
}) {
  const defaultMonths = lastNMonths(1);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [fromMonth, setFromMonth] = useState(defaultMonths.fromMonth);
  const [toMonth, setToMonth] = useState(defaultMonths.toMonth);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId) ?? null,
    [accountId, accounts],
  );

  const span = monthSpan(fromMonth, toMonth);

  function applyMonths(nextFrom: string, nextTo: string) {
    const clamped = clampReportMonths(nextFrom, nextTo);
    setFromMonth(clamped.fromMonth);
    setToMonth(clamped.toMonth);
  }

  function generate() {
    if (!selectedAccount) {
      setError("Select an account first.");
      return;
    }
    if (span > REPORT_MAX_MONTHS) {
      setError(`Period cannot be longer than ${REPORT_MAX_MONTHS} months.`);
      return;
    }

    const from = monthStart(fromMonth);
    const to = monthEnd(toMonth);

    startTransition(async () => {
      setError(null);
      try {
        const supabase = createClient();

        const priorRows = (await fetchAll((rangeFrom, rangeTo) =>
          supabase
            .from("transactions")
            .select("amount, kind")
            .eq("account_id", selectedAccount.id)
            .is("deleted_at", null)
            .lt("occurred_on", from)
            .range(rangeFrom, rangeTo),
        )) as Pick<Transaction, "amount" | "kind">[];

        const periodRows = (await fetchAll((rangeFrom, rangeTo) =>
          supabase
            .from("transactions")
            .select("*")
            .eq("account_id", selectedAccount.id)
            .is("deleted_at", null)
            .gte("occurred_on", from)
            .lte("occurred_on", to)
            .order("occurred_on", { ascending: true })
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(rangeFrom, rangeTo),
        )) as Transaction[];

        const report = buildAccountReport({
          account: selectedAccount,
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

        openAccountReportPdf(report);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not generate the report.",
        );
      }
    });
  }

  if (accounts.length === 0) {
    return (
      <p className="mt-8 text-[var(--muted)]">
        Add an account first, then come back to generate a statement.
      </p>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
      <div className="grid gap-4">
        <label className="grid gap-1 text-sm text-[var(--muted)]">
          Account
          <SearchableAccountSelect
            accounts={accounts}
            defaultValue={accountId}
            name="report-account"
            onChange={setAccountId}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)] transition hover:border-[var(--accent)]"
            type="button"
            onClick={() => {
              const range = lastNMonths(1);
              applyMonths(range.fromMonth, range.toMonth);
            }}
          >
            This month
          </button>
          <button
            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)] transition hover:border-[var(--accent)]"
            type="button"
            onClick={() => {
              const range = lastCompleteMonth();
              applyMonths(range.fromMonth, range.toMonth);
            }}
          >
            Last month
          </button>
          <button
            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)] transition hover:border-[var(--accent)]"
            type="button"
            onClick={() => {
              const range = lastNMonths(3);
              applyMonths(range.fromMonth, range.toMonth);
            }}
          >
            Last 3 months
          </button>
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
          {span} month{span > 1 ? "s" : ""} selected. Maximum is{" "}
          {REPORT_MAX_MONTHS} months.
        </p>

        {error ? <p className="text-sm text-[var(--down)]">{error}</p> : null}

        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-strong)] px-4 py-2.5 font-medium text-[var(--on-accent)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
          disabled={isPending}
          type="button"
          onClick={generate}
        >
          {isPending ? <Spinner /> : null}
          {isPending ? "Generating…" : "Generate report"}
        </button>
      </div>
    </section>
  );
}
