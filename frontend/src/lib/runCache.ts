import type { RunDetail, RunSummary } from "./types";

const cache = new Map<string, RunSummary>();

export function cacheRun(run: RunSummary) {
  cache.set(run.id, run);
}

export function getCachedRunAsDetail(id: string): RunDetail | null {
  const run = cache.get(id);
  if (!run) return null;
  return {
    ...run,
    file_path: null,
    invoice_date: null,
    extracted_data: null,
    stages: [],
    decision_reasons: [],
    final_decision: null,
    error: null,
  };
}
