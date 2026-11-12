"use client";

import { useEffect, useState } from "react";
import type { Stage } from "@/lib/types";
import { elapsedLabel } from "@/lib/format";

/**
 * Stages read as timestamped log lines rather than a decorated timeline, so
 * the elapsed column lines up and you can see where the time actually went.
 */
export function StageLadder({ stages, runStartedAt }: { stages: Stage[]; runStartedAt: string }) {
  const hasLiveStage = stages.some((s) => s.status === "running");
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!hasLiveStage) return;
    const id = setInterval(() => forceTick((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [hasLiveStage]);

  if (stages.length === 0) {
    return <p className="caption">Waiting to start</p>;
  }

  return (
    <ol className="font-data text-[13px]">
      {stages.map((stage, i) => {
        const isRunning = stage.status === "running";
        const isError = stage.status === "error";
        const color = isError
          ? "var(--rejected)"
          : isRunning
            ? "var(--accent)"
            : "var(--approved)";
        return (
          <li key={stage.name + i} className="border-t border-line py-2.5 first:border-t-0">
            <div className="flex items-baseline gap-2.5">
              <span
                className={`inline-block h-1.5 w-1.5 shrink-0 translate-y-[-1px] ${
                  isRunning ? "animate-pulse" : ""
                }`}
                style={{ backgroundColor: color }}
              />
              <span className="text-ink font-medium flex-1">{stage.name}</span>
              <span className="text-ink-soft tabular-nums text-[11px] shrink-0">
                {elapsedLabel(runStartedAt, stage.finished_at)}
              </span>
            </div>
            <p className="font-body text-xs text-ink-soft leading-relaxed mt-1 pl-4">
              {stage.detail}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
