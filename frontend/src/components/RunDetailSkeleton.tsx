import { Skeleton } from "@/components/Skeleton";

export function RunDetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1680px] px-8 py-8">
      <Skeleton className="h-3 w-24" />
      <div className="mt-4 flex items-center justify-between border-b border-line-strong pb-4">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start">
        <div className="space-y-5">
          <Skeleton className="h-[460px]" />
          <div className="border border-line bg-paper-raised">
            <div className="border-b border-line px-4 py-3">
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="px-4 py-3 space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </div>
        </div>
        <div className="border border-line bg-paper-raised">
          <div className="border-b border-line px-4 py-3">
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="px-4 py-3 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
