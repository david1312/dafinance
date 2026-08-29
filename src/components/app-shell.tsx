import Link from "next/link";
import { signOut } from "@/app/actions";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/accounts", label: "Accounts" },
  { href: "/categories", label: "Categories" },
  { href: "/settings", label: "Rates" },
];

export function AppShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-[var(--line)] px-5 py-6 lg:border-r lg:border-b-0">
        <p className="text-xs tracking-[0.22em] text-[var(--gold)] uppercase">
          dafinance
        </p>
        <nav className="mt-8 flex flex-wrap gap-3 lg:flex-col">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[var(--muted)] hover:text-[var(--ink)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <form action={signOut} className="mt-8">
          <p className="truncate text-xs text-[var(--muted)]">{email}</p>
          <button className="mt-2 text-sm text-[var(--gold)]" type="submit">
            Sign out
          </button>
        </form>
      </aside>
      <main className="px-5 py-8 lg:px-10">{children}</main>
    </div>
  );
}
