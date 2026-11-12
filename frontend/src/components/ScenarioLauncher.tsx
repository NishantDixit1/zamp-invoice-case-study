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
    <section className="border border-line bg-paper-raised h-full flex flex-col">
      <header className="flex items-center justify-between border-b border-line px-4 h-10 shrink-0">
        <h2 className="caption">Prepared scenarios</h2>
        <span className="caption">Expected outcome</span>
      </header>
      <ul className="flex-1">
        {samples.map((s) => {
          const outcome = EXPECTED_OUTCOME[s.id];
          const meta = outcome ? STATUS_META[outcome] : null;
          const isLaunching = launchingId === s.id;
          return (
            <li key={s.id} className="border-b border-line last:border-0">
              <button
                onClick={() => launch(s.id)}
                disabled={launchingId !== null}
                className="w-full text-left px-4 py-2.5 transition-colors hover:bg-paper-sunken disabled:opacity-40 group"
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-[13px] font-medium text-ink flex-1 group-hover:text-accent transition-colors">
                    {s.label}
                  </span>
                  {isLaunching ? (
                    <span className="caption" style={{ color: "var(--accent)" }}>
                      Running
                    </span>
                  ) : (
                    meta && (
                      <span
                        className="font-data text-[10px] uppercase tracking-[0.1em] shrink-0"
                        style={{ color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    )
                  )}
                </div>
                <p className="text-xs text-ink-soft leading-snug mt-0.5 pr-16">{s.description}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
