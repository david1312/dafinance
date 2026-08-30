import { CuteLoader } from "@/components/spinner";
import { Skeleton } from "@/components/skeleton";

export default function AccountsLoading() {
  return (
    <div>
      <Skeleton className="h-10 w-48" />
      <Skeleton className="mt-3 h-4 w-80" />

      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-11 rounded-lg" />
        ))}
      </div>

      <div className="mt-8 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-2xl" />
        ))}
      </div>

      <div className="mt-10">
        <CuteLoader label="Loading accounts…" />
      </div>
    </div>
  );
}
