export function isSupabaseConfigured() {
  return Boolean(
    process.env.SUPABASE_URL &&
      process.env.SUPABASE_ANON_KEY,
  );
}
