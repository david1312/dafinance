"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/currencies";
import { DeleteTransactionButton } from "@/components/delete-transaction-button";
import { Modal } from "@/components/modal";
import { TransactionForm } from "@/components/transaction-form";
import type {
  Account,
  Category,
  Transaction,
  TransactionAuditLog,
  TransactionAuditSnapshot,
} from "@/lib/types";

type ActiveModal =
  | { kind: "edit"; transaction: Transaction }
  | { kind: "history"; transaction: Transaction }
  | null;

export function TransactionTable({
  transactions,
  accounts,
  categories,
  logsByTransaction,
}: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  logsByTransaction: Record<string, TransactionAuditLog[]>;
}) {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const accountById = Object.fromEntries(
    accounts.map((account) => [account.id, account]),
  );
  const categoryById = Object.fromEntries(
    categories.map((category) => [category.id, category]),
  );

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-[var(--muted)]">
        No transactions match these filters.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead className="bg-[var(--accent-soft)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Created by</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => {
              const account = accountById[transaction.account_id];
              const category = transaction.category_id
                ? categoryById[transaction.category_id]
                : null;
              const isDeleted = Boolean(transaction.deleted_at);

              return (
                <tr
                  key={transaction.id}
                  className={`border-t border-[var(--line)] ${
                    isDeleted ? "bg-[#fff4f6] opacity-70" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <p>{formatDateOnly(transaction.occurred_on)}</p>
                    {transaction.note ? (
                      <p className="mt-0.5 max-w-48 truncate text-xs text-[var(--muted)]">
                        {transaction.note}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        transaction.kind === "income"
                          ? "bg-[#edf8f1] text-[var(--up)]"
                          : "bg-[var(--accent-soft)] text-[var(--down)]"
                      }`}
                    >
                      {transaction.kind}
                    </span>
                    {isDeleted ? (
                      <span className="ml-2 rounded-full bg-[#f4e8eb] px-2 py-1 text-xs text-[var(--down)]">
                        deleted
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {account?.name ?? "Unknown"}
                    <span className="ml-1 text-xs text-[var(--muted)]">
                      {account?.currency}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {category?.name ?? "Uncategorized"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      transaction.kind === "income"
                        ? "text-[var(--up)]"
                        : "text-[var(--down)]"
                    }`}
                  >
                    {transaction.kind === "income" ? "+" : "−"}
                    {formatMoney(transaction.amount, account?.currency ?? "IDR")}
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-48 truncate">
                      {transaction.creator_email ?? "Unknown user"}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {formatDateTime(transaction.created_at)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 whitespace-nowrap">
                      {!isDeleted ? (
                        <button
                          className="text-[var(--accent-strong)] hover:underline"
                          type="button"
                          onClick={() =>
                            setActiveModal({ kind: "edit", transaction })
                          }
                        >
                          Edit
                        </button>
                      ) : null}
                      <button
                        className="text-[var(--muted)] hover:text-[var(--ink)]"
                        type="button"
                        onClick={() =>
                          setActiveModal({ kind: "history", transaction })
                        }
                      >
                        View log
                      </button>
                      {!isDeleted ? (
                        <DeleteTransactionButton id={transaction.id} />
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeModal?.kind === "edit" ? (
        <Modal title="Edit transaction" onClose={() => setActiveModal(null)}>
          <TransactionForm
            accounts={accounts}
            categories={categories}
            transaction={activeModal.transaction}
            onSubmitted={() => setActiveModal(null)}
          />
        </Modal>
      ) : null}

      {activeModal?.kind === "history" ? (
        <Modal title="Transaction history" onClose={() => setActiveModal(null)}>
          <TransactionHistory
            accountById={accountById}
            categoryById={categoryById}
            logs={logsByTransaction[activeModal.transaction.id] ?? []}
          />
        </Modal>
      ) : null}
    </>
  );
}

function TransactionHistory({
  logs,
  accountById,
  categoryById,
}: {
  logs: TransactionAuditLog[];
  accountById: Record<string, Account>;
  categoryById: Record<string, Category>;
}) {
  if (logs.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No history recorded.</p>;
  }

  return (
    <ol className="relative ml-2 border-l border-[var(--line)] pl-6">
      {logs.map((log) => {
        const snapshot = log.new_data ?? log.old_data;
        const changes = describeChanges(
          log.old_data,
          log.new_data,
          accountById,
          categoryById,
        );

        return (
          <li key={log.id} className="relative pb-7 last:pb-0">
            <span
              className={`absolute -left-[31px] top-1 size-3 rounded-full ring-4 ring-[var(--paper)] ${
                log.action === "created"
                  ? "bg-[var(--up)]"
                  : log.action === "deleted"
                    ? "bg-[var(--down)]"
                    : "bg-[var(--accent)]"
              }`}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium capitalize">{log.action}</p>
              <time className="text-xs text-[var(--muted)]">
                {formatDateTime(log.changed_at)}
              </time>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              by {log.actor_email ?? "Unknown user"}
            </p>

            {log.action === "modified" && changes.length > 0 ? (
              <ul className="mt-3 space-y-1 rounded-xl bg-[var(--accent-soft)] p-3 text-sm">
                {changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            ) : snapshot ? (
              <div className="mt-3 grid gap-1 rounded-xl bg-[var(--accent-soft)] p-3 text-sm sm:grid-cols-2">
                <p>
                  Type: <span className="capitalize">{snapshot.kind}</span>
                </p>
                <p>
                  Amount:{" "}
                  {formatSnapshotAmount(snapshot, accountById)}
                </p>
                <p>
                  Account:{" "}
                  {snapshot.account_id
                    ? accountById[snapshot.account_id]?.name ?? "Unknown"
                    : "Unknown"}
                </p>
                <p>
                  Category:{" "}
                  {snapshot.category_id
                    ? categoryById[snapshot.category_id]?.name ?? "Unknown"
                    : "Uncategorized"}
                </p>
                <p>Date: {snapshot.occurred_on ?? "—"}</p>
                <p>Note: {snapshot.note || "—"}</p>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

const trackedFields: Array<keyof TransactionAuditSnapshot> = [
  "kind",
  "amount",
  "account_id",
  "category_id",
  "occurred_on",
  "note",
];

function describeChanges(
  oldData: TransactionAuditSnapshot | null,
  newData: TransactionAuditSnapshot | null,
  accountById: Record<string, Account>,
  categoryById: Record<string, Category>,
) {
  if (!oldData || !newData) return [];

  return trackedFields.flatMap((field) => {
    const before = oldData[field] ?? "—";
    const after = newData[field] ?? "—";
    if (String(before) === String(after)) return [];
    return [
      `${fieldLabel(field)}: ${snapshotValue(
        field,
        before,
        oldData,
        accountById,
        categoryById,
      )} → ${snapshotValue(
        field,
        after,
        newData,
        accountById,
        categoryById,
      )}`,
    ];
  });
}

function fieldLabel(field: keyof TransactionAuditSnapshot) {
  const labels: Partial<Record<keyof TransactionAuditSnapshot, string>> = {
    kind: "Type",
    amount: "Amount",
    account_id: "Account",
    category_id: "Category",
    occurred_on: "Date",
    note: "Note",
  };
  return labels[field] ?? field;
}

function snapshotValue(
  field: keyof TransactionAuditSnapshot,
  value: unknown,
  snapshot: TransactionAuditSnapshot,
  accountById: Record<string, Account>,
  categoryById: Record<string, Category>,
) {
  if (field === "account_id") {
    return accountById[String(value)]?.name ?? "Unknown";
  }
  if (field === "category_id") {
    return value === "—"
      ? "Uncategorized"
      : (categoryById[String(value)]?.name ?? "Unknown");
  }
  if (field === "amount") {
    const account = snapshot.account_id
      ? accountById[snapshot.account_id]
      : undefined;
    return formatMoney(Number(value), account?.currency ?? "IDR");
  }
  return String(value);
}

function formatSnapshotAmount(
  snapshot: TransactionAuditSnapshot,
  accountById: Record<string, Account>,
) {
  const account = snapshot.account_id
    ? accountById[snapshot.account_id]
    : undefined;
  return formatMoney(Number(snapshot.amount ?? 0), account?.currency ?? "IDR");
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
