# Ledger | Invoice Intake

Zamp AI Solutions Associate case study, PS-1 (Finance / AP): a working process that
takes an invoice PDF as input and produces a clear, reasoned decision (approved,
flagged, or rejected) as output, with every step of the reasoning visible.

## What it does

1. An invoice PDF comes in (uploaded, or launched from the built-in sample library).
2. **Extracting**. Claude reads the document. Clean, text-based PDFs are read as text;
   PDFs with no embedded text (scans) are rendered to page images and read with
   Claude's vision, so both are handled by the same extraction step.
3. **Validating**. A deterministic rule engine checks the extracted fields against the
   purchase order ledger: required fields present, vendor approved, PO matched
   (explicit reference or fuzzy vendor/amount match), duplicate detection, and amount
   vs. PO tolerance (tracking cumulative spend across multiple invoices on the same PO).
4. **Decision**. The worst outcome across all checks becomes the final verdict:
   REJECTED beats FLAGGED beats APPROVED. Every check's pass/flag/reject reasoning is
   kept and shown, not just the final verdict.

The whole run is visible live, stage by stage, and every run is kept in a dashboard
with its full trace.

## Why Claude does extraction, not regex

Invoice layouts vary by vendor and sometimes arrive as scans with no text layer at
all. The same extraction step handles both: a deterministic text-density check
(pdfplumber) decides whether a document is "text" or "scanned," and that result
drives both how Claude reads it and the FLAGGED policy for scans below. The
**matching and decision logic is deliberately NOT left to the LLM**: it's plain
Python rules against the PO ledger, so the decision is deterministic, auditable, and
explainable to a non-technical AP reviewer. Claude extracts facts from a messy
document; code applies policy to facts.

Extraction runs as a `claude -p` subprocess (restricted to the `Read` tool) rather
than a billed Messages API call, so it runs against a Claude subscription instead of
metered API usage. See **Setup** below for the one-time auth step this needs.

## Architecture

```
backend/   FastAPI + SQLite (SQLAlchemy). One endpoint kicks off a background task per
           run; the frontend polls for progress so the pipeline stages appear live.
             app/pdf_extract.py   text-density check (pdfplumber) to pick text/vision mode,
                                  then a `claude -p` subprocess (Read tool only) does the extraction
             app/matching.py      the rule engine (vendor / PO / duplicate / tolerance checks)
             app/pipeline.py      orchestrates the run, writing each stage to the DB as it completes
             app/main.py          API routes
             sample_data/         vendor master list, PO ledger, and the 8 sample invoice PDFs
frontend/  Next.js (App Router) + Tailwind. Dashboard with upload + sample launcher +
           run history; a run detail page with a live-updating pipeline view.
```

## Setup

Requires Python 3.12 (3.14 does not yet have working wheels for this dependency set),
Node 18+, and the [Claude Code CLI](https://docs.claude.com/en/docs/claude-code)
(`claude`) on PATH, since extraction shells out to it instead of calling an API
directly.

Auth for the CLI: if you're already logged in on this machine (`claude login`), there
is nothing else to do. For a headless/CI run, generate a long-lived token once with
`claude setup-token` and export it as `CLAUDE_CODE_OAUTH_TOKEN` before starting the
backend. Either way, extraction bills against your Claude subscription, not a
per-token API key.

```bash
# Backend
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # defaults are fine; see .env for the model name and DB path
python -m scripts.generate_sample_invoices   # regenerates the 8 sample PDFs, already included; only needed if you delete sample_data/invoices

# Frontend
cd ../frontend
npm install
```

`frontend/.env.local` already points at `http://localhost:8123`. Change
`NEXT_PUBLIC_API_BASE` there if the backend runs elsewhere.

## Run

```bash
./start.sh
```

Or run each separately:

```bash
# Terminal 1
cd backend && source .venv/bin/activate && uvicorn app.main:app --port 8123 --reload

# Terminal 2
cd frontend && npm run dev -- --port 4200
```

Open `http://localhost:4200`.

## Edge cases (4 required, plus 1 bonus)

All available as one-click buttons on the dashboard under "Test scenarios." Run them
in the order listed for the split-PO and duplicate cases, since they depend on prior
runs.

| # | Scenario | What it tests |
|---|----------|----------------|
| 1 | **Scanned invoice** (no text layer) | Forces the vision extraction path. Policy: any invoice read from a scan is always routed to FLAGGED for human sign-off, regardless of how clean the match is underneath. OCR/vision reads carry residual risk a human should confirm. |
| 2 | **Missing invoice number / date** | No invoice number, date, or PO reference printed. Required-fields check flags it; PO matching falls back to fuzzy vendor-name matching since there's no explicit reference. |
| 3 | **Split PO** (2 invoices) | One PO billed across two invoices. The amount check tracks *cumulative* spend against the PO across all prior runs, not just the current invoice. The first invoice approves as a partial billing, the second completes the PO exactly. |
| 4 | **Duplicate invoice** (same invoice run twice) | Same vendor + invoice number submitted a second time. Rejected outright, citing the original run by ID. |
| bonus | **Unapproved vendor** | Not one of the 4 required edge cases, included to show the hardest REJECT path, for a vendor that isn't cleared for payment at all, independent of any PO match. |

The happy path (`01_happy_path.pdf`) is a clean, text-based PDF with an explicit PO
reference and an amount inside tolerance. It auto-approves.

## Assumptions made (ambiguity in the brief)

- **"A link to your process, live and runnable"**: treated as a cloneable repo with a
  one-command start script, since the process is re-run live in the follow-up
  interview anyway, and extraction runs against a personal Claude subscription login
  rather than an API key, which a public always-on deployment can't carry. Happy to
  wire up a hosted version with its own API key if that's actually wanted.
- **PO ledger and vendor master data are self-authored** (per the FAQ, no real data
  required), designed specifically to make each edge case's logic meaningful rather
  than cosmetic.
- **Tolerance thresholds** are per-PO (`tolerance_pct` in the ledger) rather than one
  global number, since different spend categories reasonably carry different risk
  tolerance in a real procurement system.
- A scanned invoice is capped at FLAGGED even when every other check passes. This is a
  deliberate policy choice, not a limitation of the extraction.
