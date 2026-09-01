"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AmountInput } from "@/components/amount-input";
import { Modal } from "@/components/modal";
import { CuteLoader, Spinner } from "@/components/spinner";
import { TableSkeleton } from "@/components/skeleton";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionTable } from "@/components/transaction-table";
import { createClient } from "@/lib/supabase/client";
import {
  PAGE_SIZE,
  buildFilterQuery,
  parseFilters,
  type TransactionFilterState,
} from "@/lib/transaction-filters";
import { TRANSACTIONS_CHANGED } from "@/lib/transaction-events";
import type {
  Account,
  Category,
  Transaction,
  TransactionAuditLog,
} from "@/lib/types";

const fieldClass =
  "rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

type PageData = {
  transactions: Transaction[];
  logsByTransaction: Record<string, TransactionAuditLog[]>;
  hasMore: boolean;
};

export function TransactionBrowser({
  accounts,
  categories,
}: {
  accounts: Account[];
  categories: Category[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const filters = parseFilters(new URLSearchParams(search));

  const [data, setData] = useState<PageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const loadPage = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const state = parseFilters(new URLSearchParams(search));
      const ascending = state.direction === "prev";

      let query = supabase.from("transactions").select("*");

      if (!state.showDeleted) query = query.is("deleted_at", null);
      if (state.from) query = query.gte("occurred_on", state.from);
      if (state.to) query = query.lte("occurred_on", state.to);
      if (state.amount > 0) {
        query =
          state.amountMode === "lte"
            ? query.lte("amount", state.amount)
            : query.gte("amount", state.amount);
      }
      if (state.cursorAt && state.cursorId) {
        const operator = ascending ? "gt" : "lt";
        query = query.or(
          `created_at.${operator}.${state.cursorAt},and(created_at.eq.${state.cursorAt},id.${operator}.${state.cursorId})`,
        );
      }

      const { data: rows, error: queryError } = await query
        .order("created_at", { ascending })
        .order("id", { ascending })
        .limit(PAGE_SIZE + 1);

      if (signal?.aborted) return;

      if (queryError) {
        setError(queryError.message);
        setIsLoading(false);
        return;
      }

      const hasMore = (rows?.length ?? 0) > PAGE_SIZE;
      let pageRows = (rows ?? []).slice(0, PAGE_SIZE);
      if (ascending) pageRows = pageRows.reverse();

      const transactions = pageRows.map((row) => ({
        ...row,
        amount: Number(row.amount),
      })) as Transaction[];

      const ids = transactions.map((transaction) => transaction.id);
      let logsByTransaction: Record<string, TransactionAuditLog[]> = {};

      if (ids.length > 0) {
        const { data: logs } = await supabase
          .from("transaction_audit_logs")
          .select("*")
          .in("transaction_id", ids)
          .order("changed_at", { ascending: false });

        if (signal?.aborted) return;

        logsByTransaction = ((logs ?? []) as TransactionAuditLog[]).reduce<
          Record<string, TransactionAuditLog[]>
        >((grouped, log) => {
          grouped[log.transaction_id] ??= [];
          grouped[log.transaction_id].push(log);
          return grouped;
        }, {});
      }

      setData({ transactions, logsByTransaction, hasMore });
      setIsLoading(false);
    },
    [search],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadPage(controller.signal);
    return () => controller.abort();
  }, [loadPage]);

  useEffect(() => {
    function handleChange() {
      void loadPage();
    }

    window.addEventListener(TRANSACTIONS_CHANGED, handleChange);
    return () => window.removeEventListener(TRANSACTIONS_CHANGED, handleChange);
  }, [loadPage]);

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const amount = Number(String(formData.get("amount") ?? "") || 0);

    const query = buildFilterQuery({
      from: String(formData.get("from") ?? ""),
      to: String(formData.get("to") ?? ""),
      amountMode: formData.get("amountMode") === "lte" ? "lte" : "gte",
      amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
      showDeleted: formData.get("deleted") === "1",
    });

    router.push(query ? `/transactions?${query}` : "/transactions");
  }

  function goToPage(direction: "next" | "prev") {
    if (!data) return;

    const edge =
      direction === "next" ? data.transactions.at(-1) : data.transactions[0];
    if (!edge) return;

    const query = buildFilterQuery(filters, {
      cursorAt: edge.created_at,
      cursorId: edge.id,
      direction,
    });

    router.push(`/transactions?${query}`);
  }

  const hasCursor = Boolean(filters.cursorAt && filters.cursorId);
  const canGoNext =
    filters.direction === "prev" ? true : (data?.hasMore ?? false);
  const canGoPrev = hasCursor
    ? filters.direction === "prev"
      ? (data?.hasMore ?? false)
      : true
    : false;

  return (
    <section className="mt-8">
      <form
        className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={applyFilters}
      >
        <label className="grid gap-1 text-xs text-[var(--muted)]">
          Date from
          <input
            className={fieldClass}
            defaultValue={filters.from}
            name="from"
            type="date"
          />
        </label>
        <label className="grid gap-1 text-xs text-[var(--muted)]">
          Date to
          <input
            className={fieldClass}
            defaultValue={filters.to}
            name="to"
            type="date"
          />
        </label>
        <label className="grid gap-1 text-xs text-[var(--muted)]">
          Amount rule
          <select
            className={fieldClass}
            defaultValue={filters.amountMode}
            name="amountMode"
          >
            <option value="gte">Greater than or equal</option>
            <option value="lte">Less than or equal</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs text-[var(--muted)]">
          Amount
          <AmountInput
            className={fieldClass}
            defaultValue={filters.amount > 0 ? filters.amount : undefined}
            required={false}
          />
        </label>
        <div className="flex items-end gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-strong)] px-4 py-2.5 text-[var(--on-accent)] transition hover:opacity-90 disabled:opacity-70"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? <Spinner /> : null}
            Filter
          </button>
          <button
            className="py-2.5 text-[var(--muted)] transition hover:text-[var(--ink)]"
            type="button"
            onClick={() => router.push("/transactions")}
          >
            Reset
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--muted)] lg:col-span-5">
          <input
            defaultChecked={filters.showDeleted}
            name="deleted"
            type="checkbox"
            value="1"
          />
          Include deleted transactions and their logs
        </label>
      </form>

      {accounts.length > 0 ? (
        <div className="mt-6 flex justify-end">
          <button
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--accent-strong)] px-4 py-2.5 font-medium text-[var(--on-accent)] transition hover:opacity-90 sm:w-auto"
            type="button"
            onClick={() => setAdding(true)}
          >
            Add transaction
          </button>
        </div>
      ) : null}

      {adding ? (
        <Modal title="Add transaction" onClose={() => setAdding(false)}>
          <TransactionForm
            accounts={accounts}
            categories={categories}
            onSubmitted={() => setAdding(false)}
          />
        </Modal>
      ) : null}

      <div className="mt-6">
        {isLoading && !data ? (
          <div className="space-y-6">
            <CuteLoader label="Fetching your transactions…" />
            <TableSkeleton />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-8 text-center">
            <p className="text-[var(--down)]">Could not load transactions.</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{error}</p>
            <button
              className="mt-4 rounded-xl border border-[var(--line)] px-4 py-2 text-sm"
              type="button"
              onClick={() => void loadPage()}
            >
              Try again
            </button>
          </div>
        ) : (
          <div
            className={`transition-opacity duration-200 ${
              isLoading ? "pointer-events-none opacity-50" : "opacity-100"
            }`}
          >
            <TransactionTable
              accounts={accounts}
              categories={categories}
              logsByTransaction={data?.logsByTransaction ?? {}}
              transactions={data?.transactions ?? []}
            />
          </div>
        )}
      </div>

      <nav className="mt-5 flex items-center justify-between">
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm transition disabled:opacity-40"
          disabled={!canGoPrev || isLoading}
          type="button"
          onClick={() => goToPage("prev")}
        >
          ← Previous
        </button>
        <span className="text-xs text-[var(--muted)]">
          {isLoading ? "Loading…" : `${data?.transactions.length ?? 0} rows`}
        </span>
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm transition disabled:opacity-40"
          disabled={!canGoNext || isLoading}
          type="button"
          onClick={() => goToPage("next")}
        >
          Next →
        </button>
      </nav>
    </section>
  );
}

export type { TransactionFilterState };
