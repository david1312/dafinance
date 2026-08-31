"use client";

import { useActionState } from "react";
import {
  createHouseholdMember,
  type MemberActionState,
} from "@/app/actions";
import { Spinner } from "@/components/spinner";

const initialState: MemberActionState = {
  status: "idle",
  message: "",
};

export function CreateMemberForm() {
  const [state, formAction, isPending] = useActionState(
    createHouseholdMember,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="mt-5 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 sm:grid-cols-2"
    >
      <label className="grid gap-1 text-sm text-[var(--muted)]">
        Email
        <input
          autoComplete="email"
          className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-[var(--ink)]"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="grid gap-1 text-sm text-[var(--muted)]">
        Temporary password
        <input
          autoComplete="new-password"
          className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-[var(--ink)]"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>
      {state.message ? (
        <p
          className={`text-sm sm:col-span-2 ${
            state.status === "success"
              ? "text-[var(--up)]"
              : "text-[var(--down)]"
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
        {isPending ? "Creating user…" : "Create household user"}
      </button>
    </form>
  );
}
