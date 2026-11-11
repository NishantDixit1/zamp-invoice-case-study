"use client";

import { useRouter } from "next/navigation";
import type { RunSummary } from "@/lib/types";
import { formatMoney, timeAgo } from "@/lib/format";
import { StatusStamp } from "./StatusStamp";

export function RunHistoryTable({ runs }: { runs: RunSummary[] }) {
  const router = useRouter();

  if (runs.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line py-12 text-center">
        <p className="font-data text-xs uppercase tracking-widest text-ink-soft">
          No runs yet. Upload an invoice or launch a test scenario above.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-line bg-paper-raised">
      <table className="w-full text-sm">
        <thead>
          <tr className="font-data text-[11px] uppercase tracking-wider text-ink-soft border-b border-line">
            <th className="text-left font-medium px-4 py-3">Status</th>
            <th className="text-left font-medium px-4 py-3">Vendor</th>
            <th className="text-left font-medium px-4 py-3">Invoice #</th>
            <th className="text-left font-medium px-4 py-3">Matched PO</th>
            <th className="text-right font-medium px-4 py-3">Total</th>
            <th className="text-right font-medium px-4 py-3">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run.id}
              onClick={() => router.push(`/runs/${run.id}`)}
              className="border-b border-line last:border-0 cursor-pointer hover:bg-paper transition-colors"
            >
              <td className="px-4 py-3">
                <StatusStamp status={run.status} size="sm" />
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-ink">{run.vendor_name ?? "-"}</div>
                {run.scenario_label && (
                  <div className="font-data text-[11px] text-ink-soft mt-0.5">
                    {run.scenario_label}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 font-data text-ink-soft">
                {run.invoice_number ?? "-"}
              </td>
              <td className="px-4 py-3 font-data text-ink-soft">
                {run.matched_po_number ?? "-"}
              </td>
              <td className="px-4 py-3 text-right font-data tabular-nums text-ink">
                {formatMoney(run.total, run.currency)}
              </td>
              <td className="px-4 py-3 text-right font-data text-xs text-ink-soft">
                {timeAgo(run.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
