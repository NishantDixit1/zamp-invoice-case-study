import { Skeleton } from "@/components/Skeleton";

export function RunDetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1680px] px-8 py-10">
      <Skeleton className="h-4 w-40" />
      <div className="mt-3 flex items-center justify-between">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr] items-start">
        <div className="rounded-md border border-line bg-paper-raised p-5 space-y-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <div className="rounded-md border border-line bg-paper-raised p-5 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </div>
    </div>
  );
}
