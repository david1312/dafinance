"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Category } from "@/lib/types";

export const UNCATEGORIZED_FILTER = "uncategorized";

function categoryLabel(category: Category) {
  return `${category.name} (${category.kind})`;
}

export function SearchableCategorySelect({
  categories,
  defaultValue = "",
  name = "categoryId",
}: {
  categories: Category[];
  defaultValue?: string;
  name?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(defaultValue);

  const selected = categories.find((category) => category.id === selectedId);
  const display = open
    ? query
    : selected
      ? categoryLabel(selected)
      : selectedId === UNCATEGORIZED_FILTER
        ? "Uncategorized"
        : "All categories";

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter((category) =>
      [category.name, category.kind].join(" ").toLowerCase().includes(needle),
    );
  }, [categories, query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    setSelectedId(defaultValue);
  }, [defaultValue]);

  function choose(id: string) {
    setSelectedId(id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative" ref={rootRef}>
      <input name={name} type="hidden" value={selectedId} />
      <input
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        autoComplete="off"
        className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
        placeholder="Search category"
        role="combobox"
        value={display}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
      />
      {open ? (
        <ul
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] py-1 shadow-lg"
          id={listId}
          role="listbox"
        >
          <li>
            <button
              aria-selected={!selectedId}
              className={`w-full px-3 py-2.5 text-left text-sm transition hover:bg-[var(--accent-soft)] ${
                !selectedId ? "bg-[var(--accent-soft)]" : ""
              }`}
              role="option"
              type="button"
              onClick={() => choose("")}
            >
              All categories
            </button>
          </li>
          <li>
            <button
              aria-selected={selectedId === UNCATEGORIZED_FILTER}
              className={`w-full px-3 py-2.5 text-left text-sm transition hover:bg-[var(--accent-soft)] ${
                selectedId === UNCATEGORIZED_FILTER ? "bg-[var(--accent-soft)]" : ""
              }`}
              role="option"
              type="button"
              onClick={() => choose(UNCATEGORIZED_FILTER)}
            >
              Uncategorized
            </button>
          </li>
          {matches.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-[var(--muted)]">
              No matching categories
            </li>
          ) : (
            matches.map((category) => {
              const isSelected = category.id === selectedId;
              return (
                <li key={category.id}>
                  <button
                    aria-selected={isSelected}
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition hover:bg-[var(--accent-soft)] ${
                      isSelected ? "bg-[var(--accent-soft)]" : ""
                    }`}
                    role="option"
                    type="button"
                    onClick={() => choose(category.id)}
                  >
                    <span>{category.name}</span>
                    <span className="text-xs capitalize text-[var(--muted)]">
                      {category.kind}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
