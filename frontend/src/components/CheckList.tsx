import type { CheckResult } from "@/lib/types";
import { VERDICT_META } from "@/lib/format";

export function CheckList({ checks }: { checks: CheckResult[] }) {
  if (checks.length === 0) {
    return <p className="text-sm text-ink-soft">No checks have run yet.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {checks.map((c, i) => {
        const meta = VERDICT_META[c.verdict];
        return (
          <li key={i} className="py-3 flex items-start gap-3">
            <span
              className="font-data text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm shrink-0 mt-0.5"
              style={{ color: meta.color, backgroundColor: meta.soft }}
            >
              {meta.label}
            </span>
            <div>
              <p className="text-sm font-medium text-ink">{c.check}</p>
              <p className="text-sm text-ink-soft leading-relaxed mt-0.5">{c.message}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
