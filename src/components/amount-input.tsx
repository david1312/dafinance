"use client";

import { useEffect, useRef, useState } from "react";
import {
  amountCursor,
  formatAmountFixed,
  formatAmountTyping,
  parseAmount,
} from "@/lib/amount-format";

export function AmountInput({
  defaultValue,
  className,
  required = true,
}: {
  defaultValue?: number;
  className?: string;
  required?: boolean;
}) {
  const initial =
    defaultValue === undefined ? "" : formatAmountFixed(defaultValue);
  const [display, setDisplay] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number | null>(null);
  const rawValue = canonicalAmount(display);

  useEffect(() => {
    if (cursorRef.current === null || !inputRef.current) return;
    inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
    cursorRef.current = null;
  }, [display]);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;

    const reset = () => setDisplay(initial);
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [initial]);

  return (
    <>
      <input
        ref={inputRef}
        className={className}
        inputMode="decimal"
        minLength={1}
        placeholder="1,259.00"
        required={required}
        value={display}
        onBlur={() => {
          if (!display) return;
          setDisplay(formatAmountFixed(display));
        }}
        onChange={(event) => {
          const next = formatAmountTyping(event.target.value);
          const cursor = amountCursor(
            event.target.value,
            event.target.selectionStart ?? event.target.value.length,
            next,
          );
          if (next === display) {
            event.target.setSelectionRange(cursor, cursor);
            return;
          }
          cursorRef.current = cursor;
          setDisplay(next);
        }}
      />
      <input name="amount" type="hidden" value={rawValue} />
    </>
  );
}

function canonicalAmount(display: string) {
  const amount = parseAmount(display);
  if (amount === null || amount <= 0) return "";
  return amount.toFixed(2);
}
