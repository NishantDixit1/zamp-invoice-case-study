import type { RunStatus } from "@/lib/types";
import { STATUS_META } from "@/lib/format";

/**
 * Status reads as a stamped token in a ledger: a solid colour bar on the left
 * edge, squared off, monospace. Deliberately not a rounded pill.
 */
export function StatusStamp({ status, size = "md" }: { status: RunStatus; size?: "sm" | "md" }) {
  const meta = STATUS_META[status];
  const isLive = status === "queued" || status === "running";
  return (
    <span
      className={`inline-flex items-center gap-2 border-l-2 pl-2 pr-2.5 font-data font-semibold uppercase tracking-[0.12em] ${
        size === "sm" ? "text-[10px] py-0.5" : "text-[11px] py-1"
      }`}
      style={{
        color: meta.color,
        borderLeftColor: meta.color,
        backgroundColor: meta.soft,
      }}
    >
      {isLive && (
        <span
          className="inline-block h-1 w-1 animate-pulse"
          style={{ backgroundColor: meta.color }}
        />
      )}
      {meta.label}
    </span>
  );
}
