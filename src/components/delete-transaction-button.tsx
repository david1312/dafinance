"use client";

import { useTransition } from "react";
import { deleteTransaction } from "@/app/actions";
import { Spinner } from "@/components/spinner";
import { notifyTransactionsChanged } from "@/lib/transaction-events";

export function DeleteTransactionButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="inline-flex items-center gap-1.5 text-[var(--down)] transition hover:underline disabled:opacity-60"
      disabled={isPending}
      type="button"
      onClick={() => {
        if (
          !window.confirm(
            "Delete this transaction? Its audit log will be kept.",
          )
        ) {
          return;
        }

        const formData = new FormData();
        formData.set("id", id);

        startTransition(async () => {
          await deleteTransaction(formData);
          notifyTransactionsChanged();
        });
      }}
    >
      {isPending ? <Spinner className="size-3.5" /> : null}
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
