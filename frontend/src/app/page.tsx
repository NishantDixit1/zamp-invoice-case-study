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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] items-stretch">
      <Skeleton className="h-56 lg:h-full" />
      <div className="border border-line bg-paper-raised">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-line last:border-0 px-4 py-2.5">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-2.5 w-full max-w-md mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function RunHistorySkeleton() {
  return (
    <div className="border border-line bg-paper-raised">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border-b border-line last:border-0 px-4 py-3">
          <Skeleton className="h-4" />
        </div>
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
    <div className="mx-auto max-w-[1680px] px-8 py-8">
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-line-strong pb-5">
        <div>
          <h1 className="font-display text-[28px] leading-tight font-semibold text-ink">
            Invoice processing
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft max-w-2xl leading-relaxed">
            Submit an invoice PDF. The process reads it, matches it against the purchase
            order ledger, and returns an approve, flag, or reject decision with every
            check it ran.
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={isResetting || isLoading}
          className="caption border border-line px-3 py-2 hover:border-rejected hover:text-rejected transition-colors disabled:opacity-40"
        >
          {isResetting ? "Resetting" : "Reset demo data"}
        </button>
      </div>

      <section className="mt-6">
        {isLoading ? (
          <NewRunSkeleton />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] items-stretch">
            <UploadDropzone />
            <ScenarioLauncher samples={samples} />
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="caption mb-2.5">Run history</h2>
        {isLoading ? <RunHistorySkeleton /> : <RunHistoryTable runs={runs} />}
      </section>
    </div>
  );
}
