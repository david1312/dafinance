import { DashboardView } from "@/components/dashboard-view";
import { createClient } from "@/lib/supabase/server";
import type { Account, Category, Transaction } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: transactions }, { data: categories }] =
    await Promise.all([
      supabase.from("accounts").select("*").order("name"),
      supabase
        .from("transactions")
        .select("*")
        .is("deleted_at", null)
        .order("occurred_on", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
    ]);

  const accountList = (accounts ?? []) as Account[];
  const txList = (transactions ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  })) as Transaction[];
  const categoryList = (categories ?? []) as Category[];

  return (
    <DashboardView
      accounts={accountList}
      categories={categoryList}
      transactions={txList}
    />
  );
}
