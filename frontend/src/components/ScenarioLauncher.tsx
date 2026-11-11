"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SampleInvoice } from "@/lib/types";
import { runFromSample } from "@/lib/api";

export function ScenarioLauncher({ samples }: { samples: SampleInvoice[] }) {
  const router = useRouter();
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  async function launch(id: string) {
    setLaunchingId(id);
    try {
      const run = await runFromSample(id);
      router.push(`/runs/${run.id}`);
    } finally {
      setLaunchingId(null);
    }
  }

  return (
    <div className="rounded-md border border-line bg-paper-raised p-4">
      <h2 className="font-display text-sm font-semibold text-ink">Test scenarios</h2>
      <p className="mt-1 text-xs text-ink-soft">
        Pre-built invoices covering the happy path and each edge case.
      </p>
      <ul className="mt-3 space-y-2">
        {samples.map((s) => (
          <li key={s.id}>
            <button
              onClick={() => launch(s.id)}
              disabled={launchingId !== null}
              className="w-full text-left rounded-sm border border-line px-3 py-2 transition-colors hover:border-accent hover:bg-accent-soft disabled:opacity-50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink">{s.label}</span>
                {launchingId === s.id && (
                  <span className="font-data text-[10px] uppercase tracking-widest text-accent">
                    Running
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-ink-soft leading-snug">{s.description}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
