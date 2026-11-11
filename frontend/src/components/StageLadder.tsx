"use client";

import { useEffect, useState } from "react";
import type { Stage } from "@/lib/types";
import { elapsedLabel } from "@/lib/format";

export function StageLadder({ stages, runStartedAt }: { stages: Stage[]; runStartedAt: string }) {
  const hasLiveStage = stages.some((s) => s.status === "running");
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!hasLiveStage) return;
    const id = setInterval(() => forceTick((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [hasLiveStage]);

  if (stages.length === 0) {
    return (
      <p className="font-data text-xs text-ink-soft uppercase tracking-widest">
        Waiting to start...
      </p>
    );
  }

  return (
    <ol className="relative border-l border-line pl-6">
      {stages.map((stage, i) => {
        const isRunning = stage.status === "running";
        const isError = stage.status === "error";
        const dotColor = isError
          ? "var(--rejected)"
          : isRunning
            ? "var(--accent)"
            : "var(--approved)";
        return (
          <li key={stage.name + i} className="mb-7 last:mb-0">
            <span
              className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-paper-raised ${
                isRunning ? "animate-pulse" : ""
              }`}
              style={{ backgroundColor: dotColor }}
            />
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-display text-base font-semibold text-ink">{stage.name}</h3>
              <span className="font-data text-[11px] text-ink-soft tabular-nums shrink-0">
                {elapsedLabel(runStartedAt, stage.finished_at)}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-soft leading-relaxed">{stage.detail}</p>
          </li>
        );
      })}
    </ol>
  );
}
