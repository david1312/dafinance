"use client";

import { useState, useTransition } from "react";
import { resetMemberPassword } from "@/app/actions";
import { DEFAULT_RESET_PASSWORD } from "@/lib/passwords";
import { Spinner } from "@/components/spinner";

export function ResetMemberPasswordButton({ userId }: { userId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const formData = new FormData();
    formData.set("user_id", userId);
    startTransition(async () => {
      const result = await resetMemberPassword(formData);
      setOk(result.status === "success");
      setMessage(result.message);
    });
  }

  return (
    <div className="mt-3">
      <button
        className="text-xs text-[var(--muted)] underline-offset-2 transition hover:text-[var(--ink)] hover:underline disabled:opacity-70"
        disabled={isPending}
        type="button"
        onClick={handleClick}
      >
        {isPending ? (
          <span className="inline-flex items-center gap-1">
            <Spinner /> Resetting…
          </span>
        ) : (
          `Reset password to ${DEFAULT_RESET_PASSWORD}`
        )}
      </button>
      {message ? (
        <p className={`mt-1 text-xs ${ok ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
