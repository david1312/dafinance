import { createCategory, deleteCategory } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("kind")
    .order("name");
  const categories = (data ?? []) as Category[];

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
        <button
          className="rounded-lg bg-[var(--accent-strong)] px-3 py-2 font-medium text-[var(--on-accent)]"
          type="submit"
        >
          Add category
        </button>
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
            <form action={deleteCategory}>
              <input type="hidden" name="id" value={category.id} />
              <button className="text-sm text-[var(--down)]" type="submit">
                Delete
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
