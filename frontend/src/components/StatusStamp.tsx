import type { RunStatus } from "@/lib/types";
import { STATUS_META } from "@/lib/format";

export function StatusStamp({ status, size = "md" }: { status: RunStatus; size?: "sm" | "md" }) {
  const meta = STATUS_META[status];
  const isLive = status === "queued" || status === "running";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display font-semibold uppercase tracking-wide ${
        size === "sm" ? "text-[10px]" : "text-xs"
      }`}
      style={{ color: meta.color, backgroundColor: meta.soft }}
    >
      {isLive && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: meta.color }}
        />
      )}
      {meta.label}
    </span>
  );
}
