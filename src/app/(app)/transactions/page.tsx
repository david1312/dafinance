import { Suspense } from "react";
import { TransactionBrowser } from "@/components/transaction-browser";
import { TransactionForm } from "@/components/transaction-form";
import { TableSkeleton } from "@/components/skeleton";
import { createClient } from "@/lib/supabase/server";
import type { Account, Category } from "@/lib/types";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("accounts").select("*").order("name"),
    supabase.from("categories").select("*").order("name"),
  ]);

  const accountList = (accounts ?? []) as Account[];
  const categoryList = (categories ?? []) as Category[];

  return (
    <div>
      <h1 className="text-4xl" style={{ fontFamily: "var(--font-display)" }}>
        Transactions
      </h1>
      <p className="mt-1 text-[var(--muted)]">
        Amount is always in the selected account&rsquo;s currency.
      </p>

      {accountList.length === 0 ? (
        <p className="mt-8 text-[var(--muted)]">
          Add an account first, then come back to log money in and out.
        </p>
      ) : (
        <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
          <h2 className="mb-4 text-lg">Add transaction</h2>
          <TransactionForm accounts={accountList} categories={categoryList} />
        </section>
      )}

      <Suspense fallback={<TableSkeleton />}>
        <TransactionBrowser accounts={accountList} categories={categoryList} />
      </Suspense>
    </div>
  );
}
