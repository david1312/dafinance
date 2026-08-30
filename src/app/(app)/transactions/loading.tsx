import { CuteLoader } from "@/components/spinner";
import { FormSkeleton, Skeleton, TableSkeleton } from "@/components/skeleton";

export default function TransactionsLoading() {
  return (
    <div>
      <Skeleton className="h-10 w-56" />
      <Skeleton className="mt-3 h-4 w-72" />

      <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <Skeleton className="h-5 w-36" />
        <div className="mt-4">
          <FormSkeleton />
        </div>
      </section>

      <div className="mt-8 space-y-6">
        <CuteLoader label="Preparing your ledger…" />
        <TableSkeleton />
      </div>
    </div>
  );
}
