"use client";

import { useRouter } from "next/navigation";
import type { RunSummary } from "@/lib/types";
import { formatMoney, timeAgo } from "@/lib/format";
import { cacheRun } from "@/lib/runCache";
import { StatusStamp } from "./StatusStamp";

export function RunHistoryTable({ runs }: { runs: RunSummary[] }) {
  const router = useRouter();

  if (runs.length === 0) {
    return (
      <div className="border border-line bg-paper-raised py-10 text-center">
        <p className="caption">No runs yet. Submit an invoice or launch a scenario above.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-line bg-paper-raised">
      <table className="w-full font-data text-[13px]">
        <thead>
          <tr className="border-b border-line-strong">
            <th className="caption text-left font-normal px-4 py-2.5">Status</th>
            <th className="caption text-left font-normal px-4 py-2.5">Vendor</th>
            <th className="caption text-left font-normal px-4 py-2.5">Invoice no.</th>
            <th className="caption text-left font-normal px-4 py-2.5">PO</th>
            <th className="caption text-right font-normal px-4 py-2.5">Total</th>
            <th className="caption text-right font-normal px-4 py-2.5">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run.id}
              onClick={() => {
                cacheRun(run);
                router.push(`/runs/${run.id}`);
              }}
              className="border-b border-line last:border-0 cursor-pointer hover:bg-paper-sunken transition-colors"
            >
              <td className="px-4 py-2.5">
                <StatusStamp status={run.status} size="sm" />
              </td>
              <td className="px-4 py-2.5">
                <div className="font-body text-ink">{run.vendor_name ?? "-"}</div>
                {run.scenario_label && (
                  <div className="caption mt-0.5">{run.scenario_label}</div>
                )}
              </td>
              <td className="px-4 py-2.5 text-ink-soft">{run.invoice_number ?? "-"}</td>
              <td className="px-4 py-2.5 text-ink-soft">{run.matched_po_number ?? "-"}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-ink">
                {formatMoney(run.total, run.currency)}
              </td>
              <td className="px-4 py-2.5 text-right text-[11px] text-ink-soft">
                {timeAgo(run.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
