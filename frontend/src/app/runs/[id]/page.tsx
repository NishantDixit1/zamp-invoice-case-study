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
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-ink-soft">
        Loading run...
      </div>
    );
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
    <div className="mx-auto max-w-[1680px] px-8 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="font-data text-xs uppercase tracking-widest text-ink-soft hover:text-accent">
          ← Back to dashboard
        </Link>
        <div className="flex items-center gap-2 font-data text-xs uppercase tracking-widest">
          <button
            disabled={!older}
            onClick={() => older && router.push(`/runs/${older.id}`)}
            className="text-ink-soft hover:text-accent disabled:opacity-30 disabled:hover:text-ink-soft"
          >
            ← Older
          </button>
          <span className="text-line">|</span>
          <button
            disabled={!newer}
            onClick={() => newer && router.push(`/runs/${newer.id}`)}
            className="text-ink-soft hover:text-accent disabled:opacity-30 disabled:hover:text-ink-soft"
          >
            Newer →
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{run.filename}</h1>
          <p className="font-data text-xs text-ink-soft mt-1">Run {run.id}</p>
        </div>
        <StatusStamp status={run.status} />
      </div>

      {run.error && (
        <div className="mt-4 rounded-sm bg-rejected-soft px-3 py-2 text-sm text-rejected">
          {run.error}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr] items-start">
        <div className="rounded-md border border-line bg-paper-raised p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-soft mb-5">
            Pipeline
          </h2>
          <StageLadder stages={run.stages} runStartedAt={runStart} />
        </div>

        <div className="space-y-6">
          <div className="rounded-md border border-line bg-paper-raised p-5">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-soft mb-3">
              Decision
            </h2>
            {run.final_decision ? (
              <div className="mb-4">
                <StatusStamp status={run.status} />
              </div>
            ) : (
              <p className="mb-4 text-sm text-ink-soft">Checks are still running.</p>
            )}
            <CheckList checks={checks} />
          </div>

          {run.extracted_data && (
            <div className="grid gap-6 md:grid-cols-2">
              <ExtractedFieldsPanel data={run.extracted_data} />
              <POReferenceCard po={matchedPo} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
