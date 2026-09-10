"use client";

import { useState, useTransition } from "react";
import { changePassword, type MemberActionState } from "@/app/actions";
import { Spinner } from "@/components/spinner";

const initialState: MemberActionState = { status: "idle", message: "" };

export function ChangePasswordForm() {
  const [state, setState] = useState(initialState);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await changePassword(formData);
      setState(result);
      if (result.status === "success") form.reset();
    });
  }

  return (
    <form
      className="mt-5 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 sm:grid-cols-2"
      onSubmit={handleSubmit}
    >
      <label className="grid gap-1 text-sm text-[var(--muted)]">
        Current password
        <input
          autoComplete="current-password"
          className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-[var(--ink)]"
          minLength={6}
          name="current_password"
          required
          type="password"
        />
      </label>
      <label className="grid gap-1 text-sm text-[var(--muted)]">
        New password
        <input
          autoComplete="new-password"
          className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-[var(--ink)]"
          minLength={6}
          name="new_password"
          required
          type="password"
        />
      </label>
      {state.message ? (
        <p
          className={`text-sm sm:col-span-2 ${
            state.status === "success" ? "text-[var(--up)]" : "text-[var(--down)]"
          }`}
        >
          {state.message}
        </p>
      ) : null}
      <button
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent-strong)] px-4 py-2.5 font-medium text-[var(--on-accent)] disabled:opacity-70 sm:col-span-2"
        disabled={isPending}
        type="submit"
      >
        {isPending ? <Spinner /> : null}
        {isPending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
