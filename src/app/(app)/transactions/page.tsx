import { createTransaction, deleteTransaction } from "@/app/actions";
import { formatMoney } from "@/lib/currencies";
import { createClient } from "@/lib/supabase/server";
import type { Account, Category, Transaction } from "@/lib/types";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const [{ data: accounts }, { data: categories }, { data: transactions }] =
    await Promise.all([
      supabase.from("accounts").select("*").order("name"),
      supabase.from("categories").select("*").order("name"),
      supabase
        .from("transactions")
        .select("*")
        .order("occurred_on", { ascending: false })
        .limit(100),
    ]);

  const accountList = (accounts ?? []) as Account[];
  const categoryList = (categories ?? []) as Category[];
  const txList = (transactions ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  })) as Transaction[];
  const accountById = Object.fromEntries(accountList.map((a) => [a.id, a]));
  const categoryById = Object.fromEntries(categoryList.map((c) => [c.id, c]));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="text-4xl" style={{ fontFamily: "var(--font-display)" }}>
        Transactions
      </h1>
      <p className="mt-1 text-[var(--muted)]">
        Amount is always in the selected account’s currency.
      </p>

      {accountList.length === 0 ? (
        <p className="mt-8 text-[var(--muted)]">
          Add an account first, then come back to log money in and out.
        </p>
      ) : (
        <form
          action={createTransaction}
          className="mt-8 grid gap-3 md:grid-cols-6"
        >
          <select
            name="kind"
            className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
            defaultValue="expense"
          >
            <option value="expense">expense</option>
            <option value="income">income</option>
          </select>
          <select
            name="account_id"
            required
            className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
          >
            {accountList.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </select>
          <select
            name="category_id"
            className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
            defaultValue=""
          >
            <option value="">No category</option>
            {categoryList.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="Amount"
            className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
          />
          <input
            name="occurred_on"
            type="date"
            required
            defaultValue={today}
            className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
          />
          <button
            className="rounded-lg bg-[var(--gold)] px-3 py-2 font-medium text-[#1a150c]"
            type="submit"
          >
            Add
          </button>
          <input
            name="note"
            placeholder="Note (optional)"
            className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 md:col-span-6"
          />
        </form>
      )}

      <ul className="mt-8 space-y-2">
        {txList.map((tx) => {
          const account = accountById[tx.account_id];
          const currency = account?.currency ?? "IDR";
          return (
            <li
              key={tx.id}
              className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3"
            >
              <div>
                <p>
                  {tx.kind === "income" ? "+" : "−"}{" "}
                  {formatMoney(tx.amount, currency)}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  {tx.occurred_on} · {account?.name ?? "Unknown"} ·{" "}
                  {tx.category_id
                    ? categoryById[tx.category_id]?.name
                    : "Uncategorized"}
                  {tx.note ? ` · ${tx.note}` : ""}
                </p>
              </div>
              <form action={deleteTransaction}>
                <input type="hidden" name="id" value={tx.id} />
                <button className="text-sm text-[var(--down)]" type="submit">
                  Delete
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
