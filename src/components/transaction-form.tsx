"use client";

import { useState, useTransition } from "react";
import { createTransaction, updateTransaction } from "@/app/actions";
import { AmountInput } from "@/components/amount-input";
import { SearchableAccountSelect } from "@/components/searchable-account-select";
import { Spinner } from "@/components/spinner";
import { notifyTransactionsChanged } from "@/lib/transaction-events";
import type { Account, Category, Transaction } from "@/lib/types";

const fieldClass =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

export function TransactionForm({
  accounts,
  categories,
  transaction,
  onSubmitted,
}: {
  accounts: Account[];
  categories: Category[];
  transaction?: Transaction;
  onSubmitted?: () => void;
}) {
  const [kind, setKind] = useState<"income" | "expense">(
    transaction?.kind ?? "expense",
  );
  const [isPending, startTransition] = useTransition();
  const matchingCategories = categories.filter(
    (category) => category.kind === kind,
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      await (transaction ? updateTransaction : createTransaction)(formData);
      notifyTransactionsChanged();
      if (!transaction) form.reset();
      onSubmitted?.();
    });
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {transaction ? (
        <input name="id" type="hidden" value={transaction.id} />
      ) : null}

      <fieldset className="grid gap-2">
        <legend className="text-sm text-[var(--muted)]">Type</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["expense", "income"] as const).map((option) => (
            <label
              key={option}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-sm capitalize transition ${
                kind === option
                  ? option === "expense"
                    ? "border-[var(--down)] bg-[var(--accent-soft)] text-[var(--down)]"
                    : "border-[var(--up)] bg-[#edf8f1] text-[var(--up)]"
                  : "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)]"
              }`}
            >
              <input
                checked={kind === option}
                className="sr-only"
                name="kind"
                type="radio"
                value={option}
                onChange={() => setKind(option)}
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="grid gap-1 text-sm text-[var(--muted)]">
        Account
        <SearchableAccountSelect
          accounts={accounts}
          defaultValue={transaction?.account_id ?? accounts[0]?.id}
        />
      </label>

      <label className="grid gap-1 text-sm text-[var(--muted)]">
        {kind === "expense" ? "Expense category" : "Income category"}
        <select
          key={`${transaction?.id ?? "new"}-${kind}`}
          className={fieldClass}
          defaultValue={
            transaction?.kind === kind ? (transaction.category_id ?? "") : ""
          }
          name="category_id"
        >
          <option value="">Uncategorized</option>
          {matchingCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm text-[var(--muted)]">
        Amount
        <AmountInput className={fieldClass} defaultValue={transaction?.amount} />
      </label>

      <label className="grid gap-1 text-sm text-[var(--muted)]">
        Date
        <input
          className={fieldClass}
          defaultValue={
            transaction?.occurred_on ?? new Date().toISOString().slice(0, 10)
          }
          name="occurred_on"
          required
          type="date"
        />
      </label>

      <label className="grid gap-1 text-sm text-[var(--muted)]">
        Note
        <input
          className={fieldClass}
          defaultValue={transaction?.note ?? ""}
          name="note"
          placeholder="Optional note"
        />
      </label>

      <button
        className="mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-strong)] px-4 py-2.5 font-medium text-[var(--on-accent)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? <Spinner /> : null}
        {isPending
          ? "Saving…"
          : transaction
            ? "Save changes"
            : "Add transaction"}
      </button>
    </form>
  );
}
