import { Skeleton } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1680px] px-8 py-8">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-4 w-96 mt-2" />

      <div className="mt-10">
        <Skeleton className="h-4 w-20 mb-3" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] items-stretch">
          <Skeleton className="h-56" />
          <div className="border border-line bg-paper-raised">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="border-b border-line last:border-0 px-4 py-2.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-2.5 w-full max-w-md mt-2" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <Skeleton className="h-4 w-28 mb-3" />
        <div className="border border-line bg-paper-raised">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-b border-line last:border-0 px-4 py-3">
              <Skeleton className="h-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
