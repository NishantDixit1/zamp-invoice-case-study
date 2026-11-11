import type { RunStatus, CheckVerdict } from "./types";

export function formatMoney(value: number | null | undefined, currency: string | null | undefined) {
  if (value === null || value === undefined) return "-";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      currencyDisplay: "narrowSymbol",
    }).format(value);
  } catch {
    return `${currency ?? ""} ${value.toFixed(2)}`;
  }
}

export function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function elapsedLabel(startIso: string, endIso: string | null) {
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const start = new Date(startIso).getTime();
  const seconds = Math.max(0, (end - start) / 1000);
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${m.toString().padStart(2, "0")}:${s}`;
}

export const STATUS_META: Record<
  RunStatus,
  { label: string; color: string; soft: string }
> = {
  queued: { label: "Queued", color: "var(--ink-soft)", soft: "transparent" },
  running: { label: "Running", color: "var(--accent)", soft: "var(--accent-soft)" },
  approved: { label: "Approved", color: "var(--approved)", soft: "var(--approved-soft)" },
  flagged: { label: "Flagged", color: "var(--flagged)", soft: "var(--flagged-soft)" },
  rejected: { label: "Rejected", color: "var(--rejected)", soft: "var(--rejected-soft)" },
  error: { label: "Error", color: "var(--rejected)", soft: "var(--rejected-soft)" },
};

export const VERDICT_META: Record<CheckVerdict, { label: string; color: string; soft: string }> = {
  pass: { label: "Pass", color: "var(--approved)", soft: "var(--approved-soft)" },
  flag: { label: "Flag", color: "var(--flagged)", soft: "var(--flagged-soft)" },
  reject: { label: "Reject", color: "var(--rejected)", soft: "var(--rejected-soft)" },
  info: { label: "Info", color: "var(--ink-soft)", soft: "transparent" },
};
