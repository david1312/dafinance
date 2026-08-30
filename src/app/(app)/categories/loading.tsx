import { CuteLoader } from "@/components/spinner";
import { Skeleton } from "@/components/skeleton";

export default function CategoriesLoading() {
  return (
    <div>
      <Skeleton className="h-10 w-52" />

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-11 rounded-lg" />
        ))}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-2xl" />
        ))}
      </div>

      <div className="mt-10">
        <CuteLoader label="Loading categories…" />
      </div>
    </div>
  );
}
