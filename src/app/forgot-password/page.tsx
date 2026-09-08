"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { SetupNotice } from "@/components/setup-notice";
import { Spinner } from "@/components/spinner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    setSent(true);
    setMessage("If that email is registered, we sent a reset link.");
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
        Forgot password.
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Enter your email and we will send a link to set a new password.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block text-sm text-[var(--muted)]">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-[var(--ink)]"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        {message ? (
          <p
            className={`text-sm ${sent ? "text-[var(--up)]" : "text-[var(--down)]"}`}
          >
            {message}
          </p>
        ) : null}
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-strong)] py-2.5 font-medium text-[var(--on-accent)] transition disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading || sent}
          type="submit"
        >
          {loading ? <Spinner /> : null}
          {loading ? "Sending…" : sent ? "Email sent" : "Send reset link"}
        </button>
      </form>
      <Link className="mt-4 text-sm text-[var(--muted)]" href="/login">
        Back to sign in
      </Link>
    </main>
  );
}
