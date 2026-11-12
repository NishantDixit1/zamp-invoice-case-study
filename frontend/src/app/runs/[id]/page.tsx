"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getRun, listPurchaseOrders, listRuns } from "@/lib/api";
import { getCachedRunAsDetail } from "@/lib/runCache";
import type { PurchaseOrder, RunDetail, RunSummary } from "@/lib/types";
import { StatusStamp } from "@/components/StatusStamp";
import { StageLadder } from "@/components/StageLadder";
import { CheckList } from "@/components/CheckList";
import { ExtractedFieldsPanel } from "@/components/ExtractedFieldsPanel";
import { POReferenceCard } from "@/components/POReferenceCard";
import { RunDetailSkeleton } from "@/components/RunDetailSkeleton";
import { DocumentPane } from "@/components/DocumentPane";

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [run, setRun] = useState<RunDetail | null>(() => getCachedRunAsDetail(id));
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [history, setHistory] = useState<RunSummary[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    listPurchaseOrders().then(setPos).catch(() => setPos([]));
    listRuns().then(setHistory).catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    setRun(getCachedRunAsDetail(id));
    setNotFound(false);

    let cancelled = false;
    async function poll() {
      try {
        const data = await getRun(id);
        if (!cancelled) setRun(data);
        if (!cancelled && (data.status === "queued" || data.status === "running")) {
          timeoutId = setTimeout(poll, 500);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      }
    }
    let timeoutId = setTimeout(poll, 0);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [id]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-ink-soft">
          Run not found. It may have been cleared by a demo reset.
        </p>
        <Link href="/" className="mt-3 inline-block text-sm text-accent underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!run) {
    return <RunDetailSkeleton />;
  }

  const checks =
    run.decision_reasons.length > 0
      ? run.decision_reasons
      : (run.stages.find((s) => s.name === "Validating")?.data as { checks?: typeof run.decision_reasons } | null)
          ?.checks ?? [];

  const matchedPo = run.matched_po_number
    ? pos.find((p) => p.po_number === run.matched_po_number) ?? null
    : null;

  const runStart = run.stages[0]?.started_at ?? run.created_at;

  const historyIndex = history.findIndex((r) => r.id === id);
  const older = historyIndex >= 0 ? history[historyIndex + 1] : undefined;
  const newer = historyIndex > 0 ? history[historyIndex - 1] : undefined;

  return (
    <div className="mx-auto max-w-[1680px] px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="caption hover:text-accent transition-colors">
          &larr; All runs
        </Link>
        <div className="flex items-center gap-3">
          <button
            disabled={!older}
            onClick={() => older && router.push(`/runs/${older.id}`)}
            className="caption hover:text-accent disabled:opacity-30 disabled:hover:text-ink-soft transition-colors"
          >
            &larr; Older
          </button>
          <span className="h-3 w-px bg-line-strong" />
          <button
            disabled={!newer}
            onClick={() => newer && router.push(`/runs/${newer.id}`)}
            className="caption hover:text-accent disabled:opacity-30 disabled:hover:text-ink-soft transition-colors"
          >
            Newer &rarr;
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-line-strong pb-4">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="font-display text-2xl font-semibold text-ink">{run.filename}</h1>
          <span className="font-data text-[11px] text-ink-soft">{run.id}</span>
          {run.scenario_label && (
            <span className="caption">{run.scenario_label}</span>
          )}
        </div>
        <StatusStamp status={run.status} />
      </div>

      {run.error && (
        <div
          className="mt-4 border-l-2 px-3 py-2 font-data text-[13px]"
          style={{
            borderLeftColor: "var(--rejected)",
            backgroundColor: "var(--rejected-soft)",
            color: "var(--rejected)",
          }}
        >
          {run.error}
        </div>
      )}

      {/* Document on the left, what the process made of it on the right. */}
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start">
        <div className="xl:sticky xl:top-20 space-y-5">
          <DocumentPane runId={run.id} filename={run.filename} />
          <section className="border border-line bg-paper-raised">
            <header className="flex items-center border-b border-line px-4 h-10">
              <h2 className="caption">Pipeline</h2>
            </header>
            <div className="px-4 py-2">
              <StageLadder stages={run.stages} runStartedAt={runStart} />
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="border border-line bg-paper-raised">
            <header className="flex items-center justify-between border-b border-line px-4 h-10">
              <h2 className="caption">Decision trail</h2>
              {run.final_decision && <StatusStamp status={run.status} size="sm" />}
            </header>
            <div className="px-4 py-2">
              {!run.final_decision && (
                <p className="py-2 text-sm text-ink-soft">Checks are still running.</p>
              )}
              <CheckList checks={checks} />
            </div>
          </section>

          {run.extracted_data && (
            <div className="grid gap-5 md:grid-cols-2 items-start">
              <ExtractedFieldsPanel data={run.extracted_data} />
              <POReferenceCard po={matchedPo} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
