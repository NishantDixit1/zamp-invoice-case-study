"use client";

import { useEffect, useState } from "react";
import { listRuns, listSampleInvoices, resetDemoData } from "@/lib/api";
import type { RunSummary, SampleInvoice } from "@/lib/types";
import { UploadDropzone } from "@/components/UploadDropzone";
import { ScenarioLauncher } from "@/components/ScenarioLauncher";
import { RunHistoryTable } from "@/components/RunHistoryTable";
import { Skeleton } from "@/components/Skeleton";

function NewRunSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr] items-stretch">
      <Skeleton className="h-64 lg:h-full" />
      <div className="rounded-md border border-line bg-paper-raised p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-64 mt-2" />
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    </div>
  );
}

function RunHistorySkeleton() {
  return (
    <div className="rounded-md border border-line bg-paper-raised p-4 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-10" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [samples, setSamples] = useState<SampleInvoice[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listSampleInvoices()
      .then(setSamples)
      .catch(() => setSamples([]));

    let cancelled = false;
    async function poll() {
      try {
        const data = await listRuns();
        if (!cancelled) {
          setRuns(data);
          setIsLoading(false);
        }
      } catch {
        // backend not reachable yet, keep retrying silently; stays in loading state
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
    <div className="mx-auto max-w-[1680px] px-8 py-10">
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
          disabled={isResetting || isLoading}
          className="font-data text-xs uppercase tracking-widest text-ink-soft border border-line rounded-sm px-3 py-2 hover:border-rejected hover:text-rejected transition-colors disabled:opacity-50"
        >
          {isResetting ? "Resetting..." : "Reset demo data"}
        </button>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-soft mb-3">
          New run
        </h2>
        {isLoading ? (
          <NewRunSkeleton />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr] items-stretch">
            <UploadDropzone />
            <ScenarioLauncher samples={samples} />
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-soft mb-3">
          Run history
        </h2>
        {isLoading ? <RunHistorySkeleton /> : <RunHistoryTable runs={runs} />}
      </section>
    </div>
  );
}
