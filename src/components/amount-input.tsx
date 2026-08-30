"use client";

import { useState } from "react";

function formatAmount(value: string) {
  const sanitized = value
    .replaceAll(",", "")
    .replace(/[^\d.]/g, "")
    .replace(/^0+(?=\d)/, "");
  const [whole = "", ...decimalParts] = sanitized.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (decimalParts.length === 0) return grouped;
  return `${grouped}.${decimalParts.join("").slice(0, 2)}`;
}

export function AmountInput({
  defaultValue,
  className,
  required = true,
}: {
  defaultValue?: number;
  className?: string;
  required?: boolean;
}) {
  const [display, setDisplay] = useState(
    defaultValue === undefined ? "" : formatAmount(String(defaultValue)),
  );
  const rawValue = display.replaceAll(",", "");

  return (
    <>
      <input
        className={className}
        inputMode="decimal"
        minLength={1}
        placeholder="Amount"
        required={required}
        value={display}
        onChange={(event) => setDisplay(formatAmount(event.target.value))}
      />
      <input name="amount" type="hidden" value={rawValue} />
    </>
  );
}
