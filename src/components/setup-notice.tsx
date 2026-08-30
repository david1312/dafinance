export function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
      <p className="text-sm tracking-[0.2em] text-[var(--accent-strong)] uppercase">
        dafinance
      </p>
      <h1
        className="mt-3 text-4xl leading-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Connect Supabase to start tracking.
      </h1>
      <ol className="mt-8 space-y-3 text-[var(--muted)]">
        <li>1. Create a free Supabase project.</li>
        <li>
          2. Run <code className="text-[var(--ink)]">supabase/schema.sql</code>{" "}
          in the SQL editor.
        </li>
        <li>
          3. Copy URL + anon key into <code className="text-[var(--ink)]">.env.local</code>.
        </li>
        <li>4. Restart the app and sign in.</li>
      </ol>
    </main>
  );
}
