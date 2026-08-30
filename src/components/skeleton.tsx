export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block animate-pulse rounded-md bg-[var(--accent-soft)] ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 7,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
      <div className="flex gap-4 bg-[var(--accent-soft)] px-4 py-3">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 border-t border-[var(--line)] px-4 py-4"
          style={{ animationDelay: `${rowIndex * 70}ms` }}
        >
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={`h-4 flex-1 ${columnIndex === 0 ? "max-w-28" : ""}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-10 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
