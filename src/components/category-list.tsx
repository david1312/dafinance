"use client";

import { deleteCategory, updateCategory } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import type { Category } from "@/lib/types";

export function CategoryList({
  categories,
  usedCategoryIds,
  canDelete,
}: {
  categories: Category[];
  usedCategoryIds: Set<string>;
  canDelete: boolean;
}) {
  return (
    <ul className="mt-8 grid gap-3 sm:grid-cols-2">
      {categories.map((category) => (
        <li
          key={category.id}
          className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate">{category.name}</p>
            <p className="text-sm text-[var(--muted)]">{category.kind}</p>
          </div>

          <div className="flex shrink-0 items-center gap-3 pl-3">
            {/* ── Edit dropdown ── */}
            <details className="relative">
              <summary className="cursor-pointer list-none text-sm text-[var(--accent-strong)]">
                Edit
              </summary>
              <form
                action={updateCategory}
                className="absolute right-0 z-10 mt-2 grid w-64 gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 shadow-xl"
              >
                <input type="hidden" name="id" value={category.id} />
                <label className="grid gap-1 text-xs text-[var(--muted)]">
                  Name
                  <input
                    className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                    defaultValue={category.name}
                    name="name"
                    required
                  />
                </label>
                <p className="text-xs text-[var(--muted)]">
                  Kind: <span className="font-medium">{category.kind}</span>{" "}
                  (cannot be changed)
                </p>
                <SubmitButton
                  className="rounded-lg bg-[var(--accent-strong)] px-3 py-2 text-sm text-[var(--on-accent)]"
                  pendingLabel="Saving…"
                >
                  Save name
                </SubmitButton>
              </form>
            </details>

            {/* ── Delete ── */}
            {canDelete ? (
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
          </div>
        </li>
      ))}
    </ul>
  );
}
