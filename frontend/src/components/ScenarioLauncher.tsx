"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RunStatus, SampleInvoice } from "@/lib/types";
import { runFromSample } from "@/lib/api";
import { cacheRun } from "@/lib/runCache";
import { STATUS_META } from "@/lib/format";

const EXPECTED_OUTCOME: Record<string, RunStatus> = {
  "happy-path": "approved",
  "scanned-invoice": "flagged",
  "missing-fields": "flagged",
  "split-po-1": "approved",
  "split-po-2": "approved",
  "duplicate-1st": "approved",
  "duplicate-2nd": "rejected",
  "bonus-unapproved-vendor": "rejected",
};

export function ScenarioLauncher({ samples }: { samples: SampleInvoice[] }) {
  const router = useRouter();
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  async function launch(id: string) {
    setLaunchingId(id);
    try {
      const run = await runFromSample(id);
      cacheRun(run);
      router.push(`/runs/${run.id}`);
    } finally {
      setLaunchingId(null);
    }
  }

  return (
    <div className="rounded-md border border-line bg-paper-raised p-4 h-full">
      <h2 className="font-display text-sm font-semibold text-ink">Test scenarios</h2>
      <p className="mt-1 text-xs text-ink-soft">
        Pre-built invoices covering the happy path and each edge case. Expected
        outcome shown as a dot.
      </p>
      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {samples.map((s) => {
          const outcome = EXPECTED_OUTCOME[s.id];
          const meta = outcome ? STATUS_META[outcome] : null;
          return (
            <li key={s.id}>
              <button
                onClick={() => launch(s.id)}
                disabled={launchingId !== null}
                className="w-full h-full text-left rounded-sm border border-line px-3 py-2.5 transition-colors hover:border-accent hover:bg-accent-soft disabled:opacity-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-ink leading-snug">{s.label}</span>
                  {meta && (
                    <span
                      title={`Expected: ${meta.label}`}
                      className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                  )}
                </div>
                {launchingId === s.id ? (
                  <span className="font-data text-[10px] uppercase tracking-widest text-accent">
                    Running...
                  </span>
                ) : (
                  <p className="mt-0.5 text-xs text-ink-soft leading-snug line-clamp-2">
                    {s.description}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
