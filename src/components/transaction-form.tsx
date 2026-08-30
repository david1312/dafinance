"use client";

import { useState, useTransition } from "react";
import { createTransaction, updateTransaction } from "@/app/actions";
import { AmountInput } from "@/components/amount-input";
import { Spinner } from "@/components/spinner";
import { notifyTransactionsChanged } from "@/lib/transaction-events";
import type { Account, Category, Transaction } from "@/lib/types";

const fieldClass =
  "rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

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
    <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
      {transaction ? (
        <input name="id" type="hidden" value={transaction.id} />
      ) : null}

      <label className="grid gap-1 text-sm text-[var(--muted)]">
        Type
        <select
          className={fieldClass}
          name="kind"
          value={kind}
          onChange={(event) =>
            setKind(event.target.value as "income" | "expense")
          }
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </label>

      <label className="grid gap-1 text-sm text-[var(--muted)]">
        Account
        <select
          className={fieldClass}
          defaultValue={transaction?.account_id ?? accounts[0]?.id}
          name="account_id"
          required
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.currency})
            </option>
          ))}
        </select>
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

      <label className="grid gap-1 text-sm text-[var(--muted)] md:col-span-2">
        Note
        <input
          className={fieldClass}
          defaultValue={transaction?.note ?? ""}
          name="note"
          placeholder="Optional note"
        />
      </label>

      <button
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-strong)] px-4 py-2.5 font-medium text-[var(--on-accent)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2"
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
