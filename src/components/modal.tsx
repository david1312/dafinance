"use client";

import { useEffect } from "react";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      aria-modal="true"
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#3f2b33]/35 p-4 backdrop-blur-[2px]"
      role="dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="modal-panel max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-2xl sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <h2
            className="text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h2>
          <button
            aria-label="Close modal"
            className="rounded-full border border-[var(--line)] px-3 py-1 text-[var(--muted)] transition hover:bg-[var(--accent-soft)]"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}
