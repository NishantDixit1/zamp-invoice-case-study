"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  getRun,
  listPurchaseOrders,
  listRuns,
  listSampleInvoices,
  listVendors,
  resetDemoData,
} from "@/lib/api";
import type {
  PurchaseOrder,
  RunDetail,
  RunSummary,
  SampleInvoice,
  Vendor,
} from "@/lib/types";
import { formatMoney, timeAgo } from "@/lib/format";
import { cacheRun } from "@/lib/runCache";
import { UploadDropzone } from "@/components/UploadDropzone";
import { ScenarioLauncher } from "@/components/ScenarioLauncher";
import { RunHistoryTable } from "@/components/RunHistoryTable";
import { Skeleton } from "@/components/Skeleton";

const TERMINAL = new Set(["approved", "flagged", "rejected", "error"]);

function money0(value: number, currency: string | null | undefined) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency ?? ""} ${Math.round(value)}`;
  }
}

/* Sums run totals grouped by currency, largest first. Uploaded invoices can
   arrive in any currency, so a single blind sum would be wrong. */
function sumByCurrency(rs: RunSummary[]) {
  const m = new Map<string, number>();
  for (const r of rs) {
    if (r.total === null) continue;
    const ccy = r.currency || "USD";
    m.set(ccy, (m.get(ccy) ?? 0) + r.total);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function primaryMoney(rs: RunSummary[]) {
  const sums = sumByCurrency(rs);
  if (sums.length === 0) return null;
  const [ccy, v] = sums[0];
  return { text: formatMoney(v, ccy), full: formatMoney(v, ccy), extra: sums.length - 1 };
}

function Panel({
  title,
  meta,
  className = "",
  children,
}: {
  title: string;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`border border-line bg-paper-raised flex flex-col min-w-0 ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 h-9 shrink-0">
        <h2 className="caption">{title}</h2>
        {meta && <div className="font-data text-[10px] text-ink-soft truncate">{meta}</div>}
      </header>
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </section>
  );
}

/* The signature mark of the dashboard: a paper tape of every processed
   invoice, oldest at the left. Outcome is encoded twice, by colour and by
   mark height, so the strip stays readable without colour vision. */
function DecisionTape({ runs }: { runs: RunSummary[] }) {
  const router = useRouter();
  const ordered = [...runs].reverse().slice(-80);

  function markFor(r: RunSummary) {
    switch (r.status) {
      case "approved":
        return { h: "h-5", style: { background: "var(--approved)" } };
      case "flagged":
        return { h: "h-3", style: { background: "var(--flagged)" } };
      case "rejected":
        return { h: "h-1.5", style: { background: "var(--rejected)" } };
      case "error":
        return { h: "h-1.5", style: { border: "1px solid var(--rejected)" } };
      default:
        return { h: "h-4 animate-pulse", style: { background: "var(--accent)" } };
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 border border-line border-b-0 bg-paper-raised px-4 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <span className="caption shrink-0">Tape</span>
        {ordered.length === 0 ? (
          <span className="font-data text-[10px] text-ink-soft">
            prints one mark per invoice, oldest first
          </span>
        ) : (
          <div className="flex items-end gap-[3px] h-5 overflow-hidden">
            {ordered.map((r) => {
              const mark = markFor(r);
              return (
                <button
                  key={r.id}
                  title={`${r.vendor_name ?? r.filename} | ${r.status} | ${formatMoney(r.total, r.currency)}`}
                  onClick={() => {
                    cacheRun(r);
                    router.push(`/runs/${r.id}`);
                  }}
                  className="flex h-5 w-[7px] shrink-0 items-end opacity-90 hover:opacity-100"
                >
                  <span className={`w-full ${mark.h}`} style={mark.style} />
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="hidden md:flex items-center gap-3 shrink-0 font-data text-[10px] text-ink-soft">
        <span className="flex items-center gap-1">
          <i className="inline-block w-[5px] h-3.5" style={{ background: "var(--approved)" }} />
          approved
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block w-[5px] h-2" style={{ background: "var(--flagged)" }} />
          flagged
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block w-[5px] h-1" style={{ background: "var(--rejected)" }} />
          rejected
        </span>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-64 xl:col-span-5" />
        <Skeleton className="h-64 xl:col-span-4" />
        <Skeleton className="h-64 xl:col-span-3" />
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-40 xl:col-span-4" />
        <Skeleton className="h-40 xl:col-span-8" />
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-72 xl:col-span-7" />
        <Skeleton className="h-72 xl:col-span-5" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [samples, setSamples] = useState<SampleInvoice[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [details, setDetails] = useState<Record<string, RunDetail>>({});
  const [isResetting, setIsResetting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const inflight = useRef(new Set<string>());

  useEffect(() => {
    listSampleInvoices().then(setSamples).catch(() => setSamples([]));
    listPurchaseOrders().then(setPos).catch(() => setPos([]));
    listVendors().then(setVendors).catch(() => setVendors([]));

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

  /* Per-check statistics need the detail endpoint. Fetch each finished run
     once, a few per poll cycle, never in a hot loop. */
  useEffect(() => {
    const wanted = runs
      .filter((r) => TERMINAL.has(r.status) && !details[r.id] && !inflight.current.has(r.id))
      .slice(0, 6);
    for (const r of wanted) {
      inflight.current.add(r.id);
      getRun(r.id)
        .then((d) => setDetails((prev) => ({ ...prev, [d.id]: d })))
        .catch(() => {})
        .finally(() => inflight.current.delete(r.id));
    }
  }, [runs, details]);

  async function handleReset() {
    setIsResetting(true);
    try {
      await resetDemoData();
      setRuns(await listRuns());
      setDetails({});
    } finally {
      setIsResetting(false);
    }
  }

  const agg = useMemo(() => {
    const byStatus = (s: string) => runs.filter((r) => r.status === s);
    const approved = byStatus("approved");
    const flagged = byStatus("flagged");
    const rejected = byStatus("rejected");
    const errored = byStatus("error");
    const inProcess = runs.filter((r) => r.status === "queued" || r.status === "running");
    const flaggedOldestFirst = [...flagged].reverse();
    return {
      approved,
      flagged,
      rejected,
      errored,
      inProcess,
      flaggedOldestFirst,
      decided: approved.length + flagged.length + rejected.length,
      holdMoney: primaryMoney(flagged),
      releasedMoney: primaryMoney(approved),
      stoppedMoney: primaryMoney(rejected),
    };
  }, [runs]);

  const checkStats = useMemo(() => {
    const m = new Map<string, { flag: number; reject: number }>();
    let covered = 0;
    for (const r of runs) {
      const d = details[r.id];
      if (!d || d.decision_reasons.length === 0) continue;
      covered++;
      for (const c of d.decision_reasons) {
        const entry = m.get(c.check) ?? { flag: 0, reject: 0 };
        if (c.verdict === "flag") entry.flag++;
        if (c.verdict === "reject") entry.reject++;
        m.set(c.check, entry);
      }
    }
    const rows = [...m.entries()]
      .map(([check, v]) => ({ check, ...v, trips: v.flag + v.reject }))
      .sort((a, b) => b.trips - a.trips || a.check.localeCompare(b.check));
    const maxTrips = Math.max(1, ...rows.map((r) => r.trips));
    return { rows, covered, maxTrips };
  }, [runs, details]);

  const cycleLabel = useMemo(() => {
    const secs: number[] = [];
    for (const r of runs) {
      const d = details[r.id];
      if (!d || d.stages.length === 0) continue;
      const first = d.stages[0].started_at;
      const last = d.stages[d.stages.length - 1].finished_at;
      if (!first || !last) continue;
      const s = (new Date(last).getTime() - new Date(first).getTime()) / 1000;
      if (s > 0) secs.push(s);
    }
    if (secs.length === 0) return null;
    secs.sort((a, b) => a - b);
    return `${Math.round(secs[Math.floor(secs.length / 2)])}s`;
  }, [runs, details]);

  const poRows = useMemo(() => {
    return pos
      .map((po) => {
        const matched = runs.filter(
          (r) => r.matched_po_number === po.po_number && r.total !== null
        );
        const sum = (s: string) =>
          matched.filter((r) => r.status === s).reduce((acc, r) => acc + (r.total ?? 0), 0);
        const approvedVal = sum("approved");
        const flaggedVal = sum("flagged");
        const invoiced = approvedVal + flaggedVal;
        const limit = po.po_amount * (1 + po.tolerance_pct / 100);
        return {
          po,
          approvedVal,
          flaggedVal,
          invoiced,
          pct: po.po_amount > 0 ? Math.round((invoiced / po.po_amount) * 100) : 0,
          over: invoiced > limit + 0.005,
        };
      })
      .sort((a, b) => b.invoiced - a.invoiced || a.po.po_number.localeCompare(b.po.po_number));
  }, [pos, runs]);

  const vendorRows = useMemo(() => {
    return vendors
      .map((v) => {
        const rs = runs.filter((r) => r.vendor_name === v.vendor_name);
        const count = (s: string) => rs.filter((r) => r.status === s).length;
        const flaggedN = count("flagged");
        const rejectedN = count("rejected");
        const invoiced = rs
          .filter((r) => (r.status === "approved" || r.status === "flagged") && r.total !== null)
          .reduce((acc, r) => acc + (r.total ?? 0), 0);
        const ccy = rs.find((r) => r.currency)?.currency ?? "USD";
        return { v, runCount: rs.length, flaggedN, rejectedN, invoiced, ccy };
      })
      .sort(
        (a, b) =>
          b.rejectedN * 2 + b.flaggedN - (a.rejectedN * 2 + a.flaggedN) ||
          b.invoiced - a.invoiced ||
          a.v.vendor_name.localeCompare(b.v.vendor_name)
      );
  }, [vendors, runs]);

  const splitSegments = [
    { label: "approved", count: agg.approved.length, color: "var(--approved)" },
    { label: "flagged", count: agg.flagged.length, color: "var(--flagged)" },
    { label: "rejected", count: agg.rejected.length, color: "var(--rejected)" },
  ].filter((s) => s.count > 0);

  function openRun(r: RunSummary) {
    cacheRun(r);
    router.push(`/runs/${r.id}`);
  }

  return (
    <div className="mx-auto max-w-[1680px] px-5 md:px-8 py-6">
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-line-strong pb-4">
        <div>
          <h1 className="font-display text-[22px] leading-tight font-semibold text-ink">
            Accounts payable desk
          </h1>
          <p className="mt-1 text-[13px] text-ink-soft max-w-2xl leading-relaxed">
            Invoices arrive as PDFs. The engine reads each one, checks it against the
            purchase order ledger, and anything it cannot clear on its own waits here for you.
          </p>
        </div>
        <div className="flex items-center gap-5">
          <span className="caption flex items-center gap-2">
            <span
              className={`inline-block h-1.5 w-1.5 ${agg.inProcess.length > 0 ? "animate-pulse" : ""}`}
              style={{
                background: agg.inProcess.length > 0 ? "var(--accent)" : "var(--line-strong)",
              }}
            />
            {agg.inProcess.length > 0
              ? `${agg.inProcess.length} in process`
              : "engine idle"}
          </span>
          <button
            onClick={handleReset}
            disabled={isResetting || isLoading}
            className="caption border border-line px-3 py-2 hover:border-rejected hover:text-rejected transition-colors disabled:opacity-40"
          >
            {isResetting ? "Resetting" : "Reset demo data"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* State of the desk. The flagged money is the one number an AP
              manager acts on, so it gets the page's only large type. */}
          <section className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-12 items-stretch">
            <Panel
              title="Waiting on you"
              meta="flagged for human sign-off"
              className="xl:col-span-5"
            >
              <div className="px-4 pt-4 pb-3.5 border-b border-line">
                {agg.flagged.length > 0 && agg.holdMoney ? (
                  <>
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span
                        className="font-display text-[42px] leading-none font-semibold tabular-nums"
                        style={{ color: "var(--flagged)" }}
                      >
                        {agg.holdMoney.text}
                      </span>
                      {agg.holdMoney.extra > 0 && (
                        <span className="caption">
                          + {agg.holdMoney.extra} more {agg.holdMoney.extra === 1 ? "currency" : "currencies"}
                        </span>
                      )}
                    </div>
                    <p className="mt-2.5 text-xs text-ink-soft">
                      {agg.flagged.length} invoice{agg.flagged.length === 1 ? "" : "s"} on hold,
                      oldest arrived {timeAgo(agg.flaggedOldestFirst[0].created_at)}. Open one to
                      review the checks it tripped.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="font-display text-[32px] leading-none font-semibold text-ink">
                      Queue clear
                    </div>
                    <p className="mt-2.5 text-xs text-ink-soft max-w-md leading-relaxed">
                      Invoices the engine cannot clear on its own are held here, with the
                      amount at stake, until someone signs off. Launch the scanned invoice
                      scenario below to see one land.
                    </p>
                  </>
                )}
              </div>
              <ul className="flex-1">
                {agg.flaggedOldestFirst.slice(0, 5).map((r) => (
                  <li key={r.id} className="border-b border-line last:border-0">
                    <button
                      onClick={() => openRun(r)}
                      className="w-full text-left px-4 py-2 flex items-center gap-3 hover:bg-paper-sunken transition-colors group"
                    >
                      <span
                        className="h-5 w-[3px] shrink-0"
                        style={{ background: "var(--flagged)" }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] text-ink truncate group-hover:text-accent transition-colors">
                          {r.vendor_name ?? r.filename}
                        </span>
                        <span className="caption block mt-0.5 truncate">
                          {r.invoice_number ?? "no invoice number"}
                          {r.scenario_label ? ` | ${r.scenario_label}` : ""}
                        </span>
                      </span>
                      <span className="font-data text-[12px] tabular-nums text-ink shrink-0">
                        {formatMoney(r.total, r.currency)}
                      </span>
                      <span className="font-data text-[10px] text-ink-soft shrink-0 w-14 text-right">
                        {timeAgo(r.created_at)}
                      </span>
                    </button>
                  </li>
                ))}
                {agg.flagged.length > 5 && (
                  <li className="px-4 py-2 caption">
                    + {agg.flagged.length - 5} more in the processing log below
                  </li>
                )}
              </ul>
            </Panel>

            <Panel
              title="Decision ledger"
              meta={checkStats.covered > 0 && cycleLabel ? `median decision ${cycleLabel}` : undefined}
              className="xl:col-span-4"
            >
              <ul>
                {[
                  {
                    label: "Released to payment",
                    color: "var(--approved)",
                    count: agg.approved.length,
                    money: agg.releasedMoney,
                  },
                  {
                    label: "On hold, needs review",
                    color: "var(--flagged)",
                    count: agg.flagged.length,
                    money: agg.holdMoney,
                  },
                  {
                    label: "Stopped before payment",
                    color: "var(--rejected)",
                    count: agg.rejected.length,
                    money: agg.stoppedMoney,
                  },
                ].map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-line"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="h-2 w-2 shrink-0" style={{ background: row.color }} />
                      <span className="text-xs text-ink truncate">{row.label}</span>
                    </span>
                    <span className="font-data text-[12px] tabular-nums shrink-0">
                      {row.money ? (
                        <>
                          <span className="text-ink">{row.money.text}</span>
                          <span className="text-ink-soft"> | {row.count}</span>
                        </>
                      ) : (
                        <span className="text-ink-soft">none yet</span>
                      )}
                    </span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-line">
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`h-2 w-2 shrink-0 ${agg.inProcess.length > 0 ? "animate-pulse" : ""}`}
                      style={{
                        background:
                          agg.inProcess.length > 0 ? "var(--accent)" : "var(--line-strong)",
                      }}
                    />
                    <span className="text-xs text-ink truncate">In process now</span>
                  </span>
                  <span className="font-data text-[12px] tabular-nums shrink-0">
                    <span className={agg.inProcess.length > 0 ? "text-accent" : "text-ink-soft"}>
                      {agg.inProcess.length > 0
                        ? `${agg.inProcess.length} being read`
                        : "0"}
                    </span>
                  </span>
                </li>
              </ul>
              <div className="px-4 py-3 flex flex-col gap-2.5">
                {agg.decided > 0 ? (
                  <div className="flex h-2 gap-[2px]">
                    {splitSegments.map((s) => (
                      <div
                        key={s.label}
                        title={`${s.count} ${s.label} of ${agg.decided} decided`}
                        style={{ flexGrow: s.count, flexBasis: 0, background: s.color }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-px bg-line" />
                )}
                <p className="font-data text-[10px] text-ink-soft">
                  {agg.decided > 0
                    ? `share of ${agg.decided} decided${
                        agg.errored.length > 0 ? ` | ${agg.errored.length} errored` : ""
                      }`
                    : "fills as the engine decides invoices"}
                </p>
              </div>
            </Panel>

            <Panel
              title="Where invoices trip"
              meta={
                checkStats.covered > 0 ? `across ${checkStats.covered} runs` : undefined
              }
              className="xl:col-span-3"
            >
              {checkStats.rows.length === 0 ? (
                <p className="px-4 py-4 text-xs text-ink-soft leading-relaxed">
                  Every run passes through the same rule checks. The ones that raise a flag
                  or a reject are counted here, worst first.
                </p>
              ) : (
                <ul className="flex-1">
                  {checkStats.rows.map((row) => (
                    <li key={row.check} className="px-4 py-[7px] border-b border-line last:border-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs text-ink">{row.check}</span>
                        <span
                          className="font-data text-[11px] tabular-nums"
                          style={{ color: row.trips > 0 ? "var(--ink)" : "var(--ink-soft)" }}
                        >
                          {row.trips}
                        </span>
                      </div>
                      <div
                        className="mt-1.5 flex h-1 gap-[2px] bg-paper-sunken"
                        title={`${row.flag} flagged, ${row.reject} rejected across ${checkStats.covered} runs`}
                      >
                        {row.flag > 0 && (
                          <div
                            style={{
                              width: `${(row.flag / checkStats.maxTrips) * 100}%`,
                              background: "var(--flagged)",
                            }}
                          />
                        )}
                        {row.reject > 0 && (
                          <div
                            style={{
                              width: `${(row.reject / checkStats.maxTrips) * 100}%`,
                              background: "var(--rejected)",
                            }}
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </section>

          {/* Intake. Kept compact: the desk is about state, starting a run is
              one gesture. */}
          <section className="mt-4 grid gap-4 xl:grid-cols-12 items-stretch">
            <div className="xl:col-span-4">
              <UploadDropzone />
            </div>
            <div className="xl:col-span-8">
              <ScenarioLauncher samples={samples} />
            </div>
          </section>

          {/* Reference ledgers: where spend is landing, and who keeps tripping. */}
          <section className="mt-4 grid gap-4 xl:grid-cols-12 items-start">
            <Panel
              title="PO ledger | invoiced against committed"
              meta={
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <i
                      className="inline-block h-2 w-3"
                      style={{ background: "var(--approved)" }}
                    />
                    released
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="inline-block h-2 w-3 hatch-flagged" />
                    on hold
                  </span>
                </span>
              }
              className="xl:col-span-7"
            >
              <ul>
                {poRows.map(({ po, approvedVal, flaggedVal, invoiced, pct, over }) => {
                  const approvedW = Math.min((approvedVal / po.po_amount) * 100, 100);
                  const flaggedW = Math.min(
                    (flaggedVal / po.po_amount) * 100,
                    100 - approvedW
                  );
                  return (
                    <li
                      key={po.po_number}
                      className="grid grid-cols-[170px_minmax(0,1fr)_150px_44px] items-center gap-3 px-4 py-[9px] border-b border-line last:border-0"
                    >
                      <div className="min-w-0">
                        <div className="font-data text-[12px] text-ink">{po.po_number}</div>
                        <div className="caption mt-0.5 truncate">{po.vendor_name}</div>
                      </div>
                      <div
                        className="relative h-2 bg-paper-sunken"
                        title={`${po.description ?? po.po_number} | released ${money0(approvedVal, po.currency)}, on hold ${money0(flaggedVal, po.currency)}, committed ${money0(po.po_amount, po.currency)}, tolerance ${po.tolerance_pct}%`}
                      >
                        {approvedW > 0 && (
                          <div
                            className="absolute inset-y-0 left-0"
                            style={{ width: `${approvedW}%`, background: "var(--approved)" }}
                          />
                        )}
                        {flaggedW > 0 && (
                          <div
                            className="absolute inset-y-0 hatch-flagged"
                            style={{
                              left: approvedW > 0 ? `calc(${approvedW}% + 2px)` : 0,
                              width: `${flaggedW}%`,
                            }}
                          />
                        )}
                      </div>
                      <div className="text-right font-data text-[11px] tabular-nums">
                        <span className={invoiced > 0 ? "text-ink" : "text-ink-soft"}>
                          {invoiced > 0 ? money0(invoiced, po.currency) : "0"}
                        </span>
                        <span className="text-ink-soft"> / {money0(po.po_amount, po.currency)}</span>
                      </div>
                      <div
                        className="text-right font-data text-[11px] tabular-nums"
                        style={{
                          color: over
                            ? "var(--rejected)"
                            : pct > 0
                              ? "var(--ink)"
                              : "var(--ink-soft)",
                        }}
                        title={over ? "over PO amount plus tolerance" : undefined}
                      >
                        {pct}%
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>

            <Panel
              title="Vendor standing"
              meta="worst first"
              className="xl:col-span-5"
            >
              <ul>
                {vendorRows.map(({ v, runCount, flaggedN, rejectedN, invoiced, ccy }) => (
                  <li
                    key={v.vendor_name}
                    className="flex items-center justify-between gap-3 px-4 py-[8px] border-b border-line last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-ink truncate">
                        {v.vendor_name}
                        {!v.approved && (
                          <span
                            className="ml-2 font-data text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5"
                            style={{
                              color: "var(--rejected)",
                              background: "var(--rejected-soft)",
                            }}
                          >
                            not approved
                          </span>
                        )}
                      </div>
                      <div className="caption mt-0.5">
                        {v.tax_country ?? "n/a"}
                        {runCount > 0
                          ? ` | ${runCount} invoice${runCount === 1 ? "" : "s"}`
                          : " | no invoices yet"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 font-data text-[11px] tabular-nums">
                      {flaggedN > 0 && (
                        <span style={{ color: "var(--flagged)" }}>{flaggedN} flagged</span>
                      )}
                      {rejectedN > 0 && (
                        <span style={{ color: "var(--rejected)" }}>{rejectedN} rejected</span>
                      )}
                      {flaggedN === 0 && rejectedN === 0 && runCount > 0 && (
                        <span className="text-ink-soft">clean</span>
                      )}
                      <span className="text-ink w-[72px] text-right">
                        {invoiced > 0 ? money0(invoiced, ccy) : "-"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </section>

          <section className="mt-4">
            <DecisionTape runs={runs} />
            <RunHistoryTable runs={runs} />
          </section>
        </>
      )}
    </div>
  );
}
