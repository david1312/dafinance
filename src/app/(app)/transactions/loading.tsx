import { CuteLoader } from "@/components/spinner";
import { Skeleton, TableSkeleton } from "@/components/skeleton";

export default function TransactionsLoading() {
  return (
    <div>
      <Skeleton className="h-10 w-56" />
      <Skeleton className="mt-3 h-4 w-72" />

      <div className="mt-8 space-y-6">
        <CuteLoader label="Preparing your ledger…" />
        <TableSkeleton />
      </div>
    </div>
  );
}
