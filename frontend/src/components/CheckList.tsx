import type { CheckResult } from "@/lib/types";
import { VERDICT_META } from "@/lib/format";

/**
 * The decision trail. Verdicts sit in a fixed-width gutter so the whole
 * sequence can be read straight down the left edge, the way you'd scan an
 * audit log, rather than hunting for coloured chips inline.
 */
export function CheckList({ checks }: { checks: CheckResult[] }) {
  if (checks.length === 0) {
    return <p className="text-sm text-ink-soft">No checks have run yet.</p>;
  }
  return (
    <ol className="font-data text-[13px]">
      {checks.map((c, i) => {
        const meta = VERDICT_META[c.verdict];
        return (
          <li
            key={i}
            className="grid grid-cols-[2.5rem_5.5rem_1fr] gap-x-3 items-baseline border-t border-line py-2.5 first:border-t-0"
          >
            <span className="text-ink-soft tabular-nums text-[11px]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className="font-semibold uppercase tracking-[0.1em] text-[10px]"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
            <span className="font-body">
              <span className="text-ink">{c.check}</span>
              <span className="text-ink-soft"> &middot; {c.message}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
