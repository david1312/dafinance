import type { ReactNode } from "react";

export function netChangeColor(amount: number) {
  if (amount > 0) return "text-[var(--up)]";
  if (amount < 0) return "text-[var(--down)]";
  return "text-[var(--muted)]";
}

export function NetChangeBadge({ amount }: { amount: number }) {
  const [label, className] =
    amount > 0
      ? ["Surplus", "bg-[#e7f4ec] text-[var(--up)]"]
      : amount < 0
        ? ["Deficit", "bg-[var(--accent-soft)] text-[var(--down)]"]
        : ["No change", "bg-[var(--bg)] text-[var(--muted)]"];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export function SummaryCard({
  label,
  hint,
  children,
  footer,
  emphasis = false,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  footer?: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        emphasis
          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
          : "border-[var(--line)] bg-[var(--paper)]"
      }`}
    >
      <p className="text-sm text-[var(--muted)]">{label}</p>
      {hint ? <p className="text-xs text-[var(--muted)]">{hint}</p> : null}
      <div className="mt-2 text-2xl font-medium tabular-nums">{children}</div>
      {footer ? (
        <div className="mt-2 text-xs text-[var(--muted)]">{footer}</div>
      ) : null}
    </div>
  );
}
