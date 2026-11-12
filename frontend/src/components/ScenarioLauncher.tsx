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
      <header className="flex items-center justify-between border-b border-line px-4 h-9 shrink-0">
        <h2 className="caption">Prepared scenarios</h2>
        <span className="font-data text-[10px] text-ink-soft">expected outcome on each</span>
      </header>
      <ul className="grid sm:grid-cols-2 xl:grid-cols-4 gap-px bg-line flex-1">
        {samples.map((s) => {
          const outcome = EXPECTED_OUTCOME[s.id];
          const meta = outcome ? STATUS_META[outcome] : null;
          const isLaunching = launchingId === s.id;
          return (
            <li key={s.id} className="bg-paper-raised min-w-0">
              <button
                onClick={() => launch(s.id)}
                disabled={launchingId !== null}
                className="h-full w-full text-left px-3.5 py-3 flex flex-col gap-1 transition-colors hover:bg-paper-sunken disabled:opacity-40 group"
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  <span className="text-[13px] leading-snug font-medium text-ink group-hover:text-accent transition-colors">
                    {s.label}
                  </span>
                  {isLaunching ? (
                    <span className="caption shrink-0" style={{ color: "var(--accent)" }}>
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
                <p className="text-[11px] text-ink-soft leading-snug">{s.description}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
