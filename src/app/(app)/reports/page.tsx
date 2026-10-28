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
        See how each account moved over a period: where the balance started,
        where it ended, and whether you came out ahead.
      </p>
      <ReportBuilder
        accounts={(accounts ?? []) as Account[]}
        categories={(categories ?? []) as Category[]}
      />
    </div>
  );
}
