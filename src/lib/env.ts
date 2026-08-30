function describeValue(value: string | undefined) {
  if (value === undefined) return "MISSING (undefined)";
  if (value.trim() === "") return "EMPTY STRING";
  return value;
}

// The anon key is safe to ship to the browser, but logging it in full makes it
// easy to paste into a bug report by accident.
function describeKey(value: string | undefined) {
  if (value === undefined) return "MISSING (undefined)";
  if (value.trim() === "") return "EMPTY STRING";
  return `present, ${value.length} chars, starts with "${value.slice(0, 12)}"`;
}

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const configured = Boolean(url && anonKey);

  if (!configured) {
    const runtime = typeof window === "undefined" ? "server" : "browser";
    console.warn(
      [
        `[supabase] not configured (${runtime})`,
        `  NEXT_PUBLIC_SUPABASE_URL: ${describeValue(url)}`,
        `  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${describeKey(anonKey)}`,
      ].join("\n"),
    );
  }

  return configured;
}
