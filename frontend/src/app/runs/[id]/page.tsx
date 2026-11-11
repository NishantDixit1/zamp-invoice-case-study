"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getRun, listPurchaseOrders } from "@/lib/api";
import type { PurchaseOrder, RunDetail } from "@/lib/types";
import { StatusStamp } from "@/components/StatusStamp";
import { StageLadder } from "@/components/StageLadder";
import { CheckList } from "@/components/CheckList";
import { ExtractedFieldsPanel } from "@/components/ExtractedFieldsPanel";
import { POReferenceCard } from "@/components/POReferenceCard";

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    listPurchaseOrders().then(setPos).catch(() => setPos([]));
  }, []);

  useEffect(() => {
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/" className="font-data text-xs uppercase tracking-widest text-ink-soft hover:text-accent">
        ← Back to dashboard
      </Link>

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

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-line bg-paper-raised p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-soft mb-5">
            Pipeline
          </h2>
          <StageLadder stages={run.stages} runStartedAt={runStart} />
        </div>

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
      </div>

      {run.extracted_data && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ExtractedFieldsPanel data={run.extracted_data} />
          <POReferenceCard po={matchedPo} />
        </div>
      )}
    </div>
  );
}
