export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-sm bg-line/60 ${className}`} />;
}
