import { writeFileSync } from "node:fs";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

if (!url && !anonKey) {
  console.warn(
    "[env] no SUPABASE_URL / SUPABASE_ANON_KEY (or NEXT_PUBLIC_*) in the build environment",
  );
  process.exit(0);
}

writeFileSync(
  ".env.production.local",
  [
    `NEXT_PUBLIC_SUPABASE_URL=${url}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
    "",
  ].join("\n"),
);

console.log(
  "[env] copied SUPABASE_* into NEXT_PUBLIC_* for this production build",
);
