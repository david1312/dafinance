"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/spinner";

export function SubmitButton({
  children,
  className = "",
  pendingLabel,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 transition disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
      disabled={pending}
      type="submit"
    >
      {pending ? <Spinner /> : null}
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}
