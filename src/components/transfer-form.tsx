"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transferBetweenAccounts } from "@/app/actions";
import { AmountInput } from "@/components/amount-input";
import { SearchableAccountSelect } from "@/components/searchable-account-select";
import { Spinner } from "@/components/spinner";
import { notifyTransactionsChanged } from "@/lib/transaction-events";
import type { Account } from "@/lib/types";

const fieldClass =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

export function TransferForm({
  accounts,
  onSubmitted,
}: {
  accounts: Account[];
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const [fromId, setFromId] = useState(accounts[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fromAccount = accounts.find((account) => account.id === fromId);
  const toAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.id !== fromId &&
          (!fromAccount || account.currency === fromAccount.currency),
      ),
    [accounts, fromAccount, fromId],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await transferBetweenAccounts(formData);
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      notifyTransactionsChanged();
      router.refresh();
      onSubmitted?.();
    });
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <p className="text-sm text-[var(--muted)]">
        Same currency only. This posts an expense and an income under Fund
        Placements so both ledgers stay balanced.
      </p>

      <label className="grid gap-1 text-sm text-[var(--muted)]">
        From
        <SearchableAccountSelect
          accounts={accounts}
          defaultValue={fromId}
          name="from_account_id"
          onChange={(id) => {
            setFromId(id);
            setMessage(null);
          }}
        />
      </label>

      <label className="grid gap-1 text-sm text-[var(--muted)]">
        To
        {toAccounts.length === 0 ? (
          <p className="rounded-xl border border-[var(--line)] px-3 py-2.5 text-[var(--down)]">
            No other {fromAccount?.currency ?? ""} account to transfer into.
          </p>
        ) : (
          <SearchableAccountSelect
            key={`${fromId}-${toAccounts.map((account) => account.id).join(",")}`}
            accounts={toAccounts}
            defaultValue={toAccounts[0]?.id}
            name="to_account_id"
          />
        )}
      </label>

      <label className="grid gap-1 text-sm text-[var(--muted)]">
        Amount
        <AmountInput className={fieldClass} />
      </label>

      <label className="grid gap-1 text-sm text-[var(--muted)]">
        Date
        <input
          className={fieldClass}
          defaultValue={new Date().toISOString().slice(0, 10)}
          name="occurred_on"
          required
          type="date"
        />
      </label>

      <label className="grid gap-1 text-sm text-[var(--muted)]">
        Note
        <input
          className={fieldClass}
          name="note"
          placeholder="Optional note"
        />
      </label>

      {message ? <p className="text-sm text-[var(--down)]">{message}</p> : null}

      <button
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-strong)] px-4 py-2.5 font-medium text-[var(--on-accent)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending || toAccounts.length === 0}
        type="submit"
      >
        {isPending ? <Spinner /> : null}
        {isPending ? "Transferring…" : "Transfer"}
      </button>
    </form>
  );
}
