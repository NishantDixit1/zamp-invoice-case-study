import { Skeleton } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1680px] px-8 py-10">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-4 w-96 mt-2" />

      <div className="mt-10">
        <Skeleton className="h-4 w-20 mb-3" />
        <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr] items-stretch">
          <Skeleton className="h-64" />
          <div className="rounded-md border border-line bg-paper-raised p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <Skeleton className="h-4 w-28 mb-3" />
        <div className="rounded-md border border-line bg-paper-raised p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </div>
    </div>
  );
}
