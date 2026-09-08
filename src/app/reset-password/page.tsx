"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { SetupNotice } from "@/components/setup-notice";
import { Spinner } from "@/components/spinner";

export default function ResetPasswordPage() {
  const configured = isSupabaseConfigured();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(!configured);
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setHasSession(Boolean(user));
      setReady(true);
    });
  }, [configured]);

  if (!configured) {
    return <SetupNotice />;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-sm tracking-[0.2em] text-[var(--accent-strong)] uppercase">
        dafinance
      </p>
      <h1
        className="mt-3 text-4xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Set a new password.
      </h1>

      {!ready ? (
        <p className="mt-8 text-sm text-[var(--muted)]">Checking your link…</p>
      ) : !hasSession ? (
        <>
          <p className="mt-4 text-sm text-[var(--down)]">
            This reset link is invalid or has expired. Request a new one.
          </p>
          <Link
            className="mt-6 text-sm text-[var(--accent-strong)]"
            href="/forgot-password"
          >
            Forgot password
          </Link>
        </>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-sm text-[var(--muted)]">
            New password
            <input
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-[var(--ink)]"
              minLength={6}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="block text-sm text-[var(--muted)]">
            Confirm password
            <input
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-[var(--ink)]"
              minLength={6}
              required
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </label>
          {message ? (
            <p className="text-sm text-[var(--down)]">{message}</p>
          ) : null}
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-strong)] py-2.5 font-medium text-[var(--on-accent)] transition disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
            type="submit"
          >
            {loading ? <Spinner /> : null}
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
      )}
    </main>
  );
}
