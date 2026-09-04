"use client";

import { useMemo, useState } from "react";
import { deleteAccount, updateAccount } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { ACCOUNT_KINDS, CURRENCIES, accountKindLabel, formatMoney } from "@/lib/currencies";
import type { Account, Transaction } from "@/lib/types";

export function AccountList({
  accounts,
  memberEmailById,
  transactions,
  usedAccountIds,
  userId,
}: {
  accounts: Account[];
  memberEmailById: Record<string, string>;
  transactions: Pick<Transaction, "account_id" | "amount" | "kind">[];
  usedAccountIds: string[];
  userId?: string;
}) {
  const [query, setQuery] = useState("");
  const usedIds = new Set(usedAccountIds);
  const filteredAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return accounts;

    return accounts.filter((account) =>
      [account.name, account.kind, account.currency]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [accounts, query]);

  return (
    <section className="mt-8">
      <label className="grid gap-1 text-sm text-[var(--muted)]">
        Search accounts
        <input
          className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
          placeholder="Name, type, or currency"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <ul className="mt-5 space-y-3">
        {filteredAccounts.length === 0 ? (
          <li className="text-[var(--muted)]">
            {accounts.length === 0
              ? "No accounts yet."
              : "No accounts match your search."}
          </li>
        ) : (
          filteredAccounts.map((account) => {
            const balance = transactions
              .filter((transaction) => transaction.account_id === account.id)
              .reduce(
                (sum, transaction) =>
                  sum +
                  (transaction.kind === "income"
                    ? transaction.amount
                    : -transaction.amount),
                0,
              );

            return (
              <li
                key={account.id}
                className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-4"
              >
                <div>
                  <p className="text-lg">{account.name}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {accountKindLabel(account.kind)} · {account.currency}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {account.user_id === userId
                      ? "Your account"
                      : `Owned by ${memberEmailById[account.user_id] ?? "household member"}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p>{formatMoney(balance, account.currency)}</p>
                  {account.user_id === userId ? (
                    <div className="flex items-center gap-3">
                      <details className="relative">
                        <summary className="cursor-pointer list-none text-sm text-[var(--accent-strong)]">
                          Edit
                        </summary>
                        <form
                          action={updateAccount}
                          className="absolute right-0 z-10 mt-2 grid w-72 gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 shadow-xl"
                        >
                          <input name="id" type="hidden" value={account.id} />
                          <input
                            className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
                            defaultValue={account.name}
                            name="name"
                            required
                          />
                          <select
                            className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
                            defaultValue={account.kind}
                            name="kind"
                          >
                            {ACCOUNT_KINDS.map((kind) => (
                              <option key={kind} value={kind}>
                                {accountKindLabel(kind)}
                              </option>
                            ))}
                          </select>
                          {usedIds.has(account.id) ? (
                            <>
                              <input name="currency" type="hidden" value={account.currency} />
                              <p className="text-xs text-[var(--muted)]">
                                Currency: {account.currency}. It cannot change after an account has transactions.
                              </p>
                            </>
                          ) : (
                            <select
                              className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
                              defaultValue={account.currency}
                              name="currency"
                            >
                              {CURRENCIES.map((currency) => (
                                <option key={currency} value={currency}>
                                  {currency}
                                </option>
                              ))}
                            </select>
                          )}
                          <SubmitButton
                            className="rounded-lg bg-[var(--accent-strong)] px-3 py-2 text-[var(--on-accent)]"
                            pendingLabel="Saving…"
                          >
                            Save changes
                          </SubmitButton>
                        </form>
                      </details>
                      <form action={deleteAccount}>
                        <input type="hidden" name="id" value={account.id} />
                        <SubmitButton className="text-sm text-[var(--down)]" pendingLabel="Deleting…">
                          Delete
                        </SubmitButton>
                      </form>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}