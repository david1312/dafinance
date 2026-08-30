import { signOut } from "@/app/actions";
import { NavLink } from "@/components/nav-link";
import { SubmitButton } from "@/components/submit-button";

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
        <p className="text-xs tracking-[0.22em] text-[var(--accent-strong)] uppercase">
          dafinance
        </p>
        <nav className="mt-8 flex flex-wrap gap-3 lg:flex-col">
          {links.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <form action={signOut} className="mt-8">
          <p className="truncate text-xs text-[var(--muted)]">{email}</p>
          <SubmitButton
            className="mt-2 text-sm text-[var(--accent-strong)]"
            pendingLabel="Signing out…"
          >
            Sign out
          </SubmitButton>
        </form>
      </aside>
      <main className="px-5 py-8 lg:px-10">{children}</main>
    </div>
  );
}
