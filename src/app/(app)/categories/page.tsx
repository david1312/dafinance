import { createCategory } from "@/app/actions";
import { CategoryList } from "@/components/category-list";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data }, { data: membership }, { data: usedCategories }] =
    await Promise.all([
      supabase.from("categories").select("*").order("kind").order("name"),
      supabase
        .from("household_members")
        .select("role")
        .eq("user_id", user?.id ?? "")
        .maybeSingle(),
      supabase.from("transactions").select("category_id").not("category_id", "is", null),
    ]);
  const categories = (data ?? []) as Category[];
  const usedCategoryIds = new Set(
    (usedCategories ?? []).flatMap((row) =>
      row.category_id ? [row.category_id] : [],
    ),
  );
  const canDeleteCategories = membership?.role === "owner";

  return (
    <div>
      <h1 className="text-4xl" style={{ fontFamily: "var(--font-display)" }}>
        Categories
      </h1>
      <form action={createCategory} className="mt-8 grid gap-3 sm:grid-cols-3">
        <input
          name="name"
          required
          placeholder="Groceries"
          className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
        />
        <select
          name="kind"
          className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
          defaultValue="expense"
        >
          <option value="expense">expense</option>
          <option value="income">income</option>
        </select>
        <SubmitButton
          className="rounded-lg bg-[var(--accent-strong)] px-3 py-2 font-medium text-[var(--on-accent)]"
          pendingLabel="Adding…"
        >
          Add category
        </SubmitButton>
      </form>

      <CategoryList
        categories={categories}
        usedCategoryIds={usedCategoryIds}
        canDelete={canDeleteCategories}
      />
    </div>
  );
}
