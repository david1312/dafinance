import { createAccount, deleteAccount } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { ACCOUNT_KINDS, CURRENCIES, accountKindLabel, formatMoney } from "@/lib/currencies";
import { createClient } from "@/lib/supabase/server";
import type { Account, Transaction } from "@/lib/types";

export default async function AccountsPage() {
  const supabase = await createClient();
  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase.from("accounts").select("*").order("created_at"),
    supabase
      .from("transactions")
      .select("account_id, amount, kind")
      .is("deleted_at", null),
  ]);

  const accountList = (accounts ?? []) as Account[];
  const txList = (transactions ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  })) as Pick<Transaction, "account_id" | "amount" | "kind">[];

  return (
    <div>
      <h1 className="text-4xl" style={{ fontFamily: "var(--font-display)" }}>
        Accounts
      </h1>
      <p className="mt-1 text-[var(--muted)]">
        Each account stays in one currency: IDR, USD, SGD, or JPY.
      </p>

      <form action={createAccount} className="mt-8 grid gap-3 sm:grid-cols-4">
        <input
          name="name"
          required
          placeholder="BCA / Wise / Gold / S&P"
          className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
        />
        <select
          name="kind"
          className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
          defaultValue="bank"
        >
          {ACCOUNT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {accountKindLabel(kind)}
            </option>
          ))}
        </select>
        <select
          name="currency"
          className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
          defaultValue="IDR"
        >
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
        <SubmitButton
          className="rounded-lg bg-[var(--accent-strong)] px-3 py-2 font-medium text-[var(--on-accent)]"
          pendingLabel="Adding…"
        >
          Add account
        </SubmitButton>
      </form>

      <ul className="mt-8 space-y-3">
        {accountList.length === 0 ? (
          <li className="text-[var(--muted)]">No accounts yet.</li>
        ) : (
          accountList.map((account) => {
            const balance = txList
              .filter((tx) => tx.account_id === account.id)
              .reduce(
                (sum, tx) =>
                  sum + (tx.kind === "income" ? tx.amount : -tx.amount),
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
                </div>
                <div className="flex items-center gap-4">
                  <p>{formatMoney(balance, account.currency)}</p>
                  <form action={deleteAccount}>
                    <input type="hidden" name="id" value={account.id} />
                    <SubmitButton
                      className="text-sm text-[var(--down)]"
                      pendingLabel="Deleting…"
                    >
                      Delete
                    </SubmitButton>
                  </form>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
