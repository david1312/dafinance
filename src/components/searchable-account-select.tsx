"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { accountKindLabel } from "@/lib/currencies";
import type { Account } from "@/lib/types";

function accountLabel(account: Account) {
  return `${account.name} (${account.currency})`;
}

export function SearchableAccountSelect({
  accounts,
  defaultValue,
  name = "account_id",
  required = true,
}: {
  accounts: Account[];
  defaultValue?: string;
  name?: string;
  required?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(
    defaultValue ?? accounts[0]?.id ?? "",
  );

  const selected = accounts.find((account) => account.id === selectedId);
  const display = open ? query : selected ? accountLabel(selected) : "";

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return accounts;

    return accounts.filter((account) => {
      const haystack = [
        account.name,
        account.currency,
        accountKindLabel(account.kind),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [accounts, query]);

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

  function choose(account: Account) {
    setSelectedId(account.id);
    setQuery("");
    setOpen(false);
  }

  const listId = "account-options";

  return (
    <div className="relative" ref={rootRef}>
      <input name={name} required={required} type="hidden" value={selectedId} />
      <input
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        autoComplete="off"
        className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
        placeholder="Search account"
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
          {matches.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-[var(--muted)]">
              No matching accounts
            </li>
          ) : (
            matches.map((account) => {
              const isSelected = account.id === selectedId;
              return (
                <li key={account.id}>
                  <button
                    aria-selected={isSelected}
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition hover:bg-[var(--accent-soft)] ${
                      isSelected ? "bg-[var(--accent-soft)]" : ""
                    }`}
                    role="option"
                    type="button"
                    onClick={() => choose(account)}
                  >
                    <span>{account.name}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {accountKindLabel(account.kind)} · {account.currency}
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
