function describeValue(value: string | undefined) {
  if (value === undefined) return "MISSING (undefined)";
  if (value.trim() === "") return "EMPTY STRING";
  return value;
}

function describeKey(value: string | undefined) {
  if (value === undefined) return "MISSING (undefined)";
  if (value.trim() === "") return "EMPTY STRING";
  return `present, ${value.length} chars, starts with "${value.slice(0, 12)}"`;
}

export function getSupabaseEnv() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  return { url, anonKey };
}

export function getSupabaseAdminEnv() {
  const { url } = getSupabaseEnv();
  return {
    url,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseEnv();
  const configured = Boolean(url && anonKey);

  if (!configured) {
    const runtime = typeof window === "undefined" ? "server" : "browser";
    console.warn(
      [
        `[supabase] not configured (${runtime})`,
        `  NEXT_PUBLIC_SUPABASE_URL: ${describeValue(process.env.NEXT_PUBLIC_SUPABASE_URL)}`,
        `  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${describeKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)}`,
        `  SUPABASE_URL: ${describeValue(process.env.SUPABASE_URL)}`,
        `  SUPABASE_ANON_KEY: ${describeKey(process.env.SUPABASE_ANON_KEY)}`,
      ].join("\n"),
    );
  }

  return configured;
}
