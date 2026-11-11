"use client";

import { useEffect, useState } from "react";
import { listRuns, listSampleInvoices, resetDemoData } from "@/lib/api";
import type { RunSummary, SampleInvoice } from "@/lib/types";
import { UploadDropzone } from "@/components/UploadDropzone";
import { ScenarioLauncher } from "@/components/ScenarioLauncher";
import { RunHistoryTable } from "@/components/RunHistoryTable";

export default function DashboardPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [samples, setSamples] = useState<SampleInvoice[]>([]);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    listSampleInvoices().then(setSamples).catch(() => setSamples([]));

    let cancelled = false;
    async function poll() {
      try {
        const data = await listRuns();
        if (!cancelled) setRuns(data);
      } catch {
        // backend not reachable yet, keep retrying silently
      }
    }
    poll();
    const id = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  async function handleReset() {
    setIsResetting(true);
    try {
      await resetDemoData();
      setRuns(await listRuns());
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Invoice processing
          </h1>
          <p className="mt-1 text-sm text-ink-soft max-w-xl">
            Submit an invoice PDF and watch it move from extraction to a reasoned
            approve, flag, or reject decision against the purchase order ledger.
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={isResetting}
          className="font-data text-xs uppercase tracking-widest text-ink-soft border border-line rounded-sm px-3 py-2 hover:border-rejected hover:text-rejected transition-colors disabled:opacity-50"
        >
          {isResetting ? "Resetting..." : "Reset demo data"}
        </button>
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <UploadDropzone />
        <ScenarioLauncher samples={samples} />
      </section>

      <section className="mt-10">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-soft mb-3">
          Run history
        </h2>
        <RunHistoryTable runs={runs} />
      </section>
    </div>
  );
}
