import { createCategory, deleteCategory } from "@/app/actions";
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

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {categories.map((category) => (
          <li
            key={category.id}
            className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3"
          >
            <div>
              <p>{category.name}</p>
              <p className="text-sm text-[var(--muted)]">{category.kind}</p>
            </div>
            {canDeleteCategories ? (
              usedCategoryIds.has(category.id) ? (
                <span
                  className="text-xs text-[var(--muted)]"
                  title="Categories used by a transaction cannot be deleted"
                >
                  In use
                </span>
              ) : (
                <form action={deleteCategory}>
                  <input type="hidden" name="id" value={category.id} />
                  <SubmitButton
                    className="text-sm text-[var(--down)]"
                    pendingLabel="Deleting…"
                  >
                    Delete
                  </SubmitButton>
                </form>
              )
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
