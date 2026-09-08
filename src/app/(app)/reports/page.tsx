import { ReportBuilder } from "@/components/report-builder";
import { createClient } from "@/lib/supabase/server";
import type { Account, Category } from "@/lib/types";

export default async function ReportsPage() {
  const supabase = await createClient();
  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("accounts").select("*").order("name"),
    supabase.from("categories").select("*").order("name"),
  ]);

  return (
    <div>
      <h1 className="text-4xl" style={{ fontFamily: "var(--font-display)" }}>
        Reports
      </h1>
      <p className="mt-1 max-w-2xl text-[var(--muted)]">
        Generate an account statement for up to three months. The PDF opens in a
        new tab with opening balance, running balance, and money in/out.
      </p>
      <ReportBuilder
        accounts={(accounts ?? []) as Account[]}
        categories={(categories ?? []) as Category[]}
      />
    </div>
  );
}
