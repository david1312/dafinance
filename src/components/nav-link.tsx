"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Spinner } from "@/components/spinner";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      className={`flex items-center gap-2 transition ${
        isActive
          ? "text-[var(--accent-strong)]"
          : "text-[var(--muted)] hover:text-[var(--ink)]"
      }`}
      href={href}
    >
      {children}
      <NavLinkPending />
    </Link>
  );
}

function NavLinkPending() {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className="size-3.5" /> : null;
}
