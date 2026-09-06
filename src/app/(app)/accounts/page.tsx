import { createAccount } from "@/app/actions";
import { AccountList } from "@/components/account-list";
import { SubmitButton } from "@/components/submit-button";
import { ACCOUNT_KINDS, CURRENCIES, accountKindLabel } from "@/lib/currencies";
import { createClient } from "@/lib/supabase/server";
import type { Account, Transaction } from "@/lib/types";

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [
    { data: accounts },
    { data: transactions },
    { data: members },
    { data: usedAccounts },
  ] =
    await Promise.all([
    supabase.from("accounts").select("*").order("created_at"),
    supabase
      .from("transactions")
      .select("account_id, amount, kind")
      .is("deleted_at", null),
    supabase.from("household_members").select("user_id, email"),
    supabase.from("transactions").select("account_id"),
  ]);

  const accountList = (accounts ?? []) as Account[];
  const memberEmailById = Object.fromEntries(
    (members ?? []).map((member) => [member.user_id, member.email]),
  );
  const usedAccountIds = new Set(
    (usedAccounts ?? []).map((transaction) => transaction.account_id),
  );
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

      <AccountList
        accounts={accountList}
        memberEmailById={memberEmailById}
        transactions={txList}
        usedAccountIds={[...usedAccountIds]}
        userId={user?.id}
      />
    </div>
  );
}
