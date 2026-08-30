import { CuteLoader } from "@/components/spinner";
import { CardSkeleton, Skeleton } from "@/components/skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-3 h-4 w-80" />

      <section className="mt-8">
        <Skeleton className="h-3 w-40" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5"
          >
            <Skeleton className="h-5 w-44" />
            <div className="mt-6 flex justify-center">
              <Skeleton className="size-40 rounded-full" />
            </div>
            <div className="mt-6 space-y-2">
              {Array.from({ length: 4 }).map((_, row) => (
                <Skeleton key={row} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ))}
      </section>

      <div className="mt-10">
        <CuteLoader label="Crunching this month&rsquo;s numbers…" />
      </div>
    </div>
  );
}
