import { CuteLoader } from "@/components/spinner";
import { Skeleton } from "@/components/skeleton";

export default function ReportsLoading() {
  return (
    <div>
      <Skeleton className="h-10 w-40" />
      <Skeleton className="mt-3 h-4 w-80" />
      <div className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <Skeleton className="h-11 w-full" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
        <Skeleton className="mt-4 h-11 w-40" />
      </div>
      <div className="mt-10">
        <CuteLoader label="Preparing reports…" />
      </div>
    </div>
  );
}
