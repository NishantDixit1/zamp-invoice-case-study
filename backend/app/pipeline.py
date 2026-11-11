import asyncio
from datetime import datetime, timezone
from pathlib import Path

from app.config import STAGE_PACING_SECONDS
from app.database import SessionLocal
from app.models import InvoiceRun
from app.pdf_extract import extract_invoice_fields
from app.matching import run_checks


def _utc_now_iso() -> str:
    # Explicit 'Z' so the frontend never mistakes this for a local-time string.
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _add_stage(run: InvoiceRun, name: str, status: str, detail: str, data=None):
    stages = list(run.stages or [])
    stages.append({
        "name": name,
        "status": status,
        "detail": detail,
        "data": data,
        "started_at": _utc_now_iso(),
        "finished_at": _utc_now_iso() if status in ("done", "error") else None,
    })
    run.stages = stages


def _update_last_stage(run: InvoiceRun, status: str, detail: str, data=None):
    stages = list(run.stages or [])
    if not stages:
        return
    last = dict(stages[-1])
    last["status"] = status
    last["detail"] = detail
    if data is not None:
        last["data"] = data
    last["finished_at"] = _utc_now_iso()
    stages[-1] = last
    run.stages = stages


async def process_run(run_id: str):
    db = SessionLocal()
    try:
        run = db.query(InvoiceRun).filter(InvoiceRun.id == run_id).first()
        if run is None:
            return
        run.status = "running"

        _add_stage(run, "Received", "done", f"'{run.filename}' received and queued for processing.")
        db.commit()
        await asyncio.sleep(STAGE_PACING_SECONDS)

        _add_stage(run, "Extracting", "running", "Reading the document with Claude...")
        db.commit()
        try:
            extraction = await extract_invoice_fields(Path(run.file_path))
        except Exception as exc:  # noqa: BLE001
            _update_last_stage(run, "error", f"Extraction failed: {exc}")
            run.status = "error"
            run.error = str(exc)
            db.commit()
            return

        data = extraction["data"]
        _update_last_stage(
            run, "done",
            f"Extracted via {extraction['method']} reading (confidence {extraction['confidence']:.0%}).",
            data=extraction,
        )
        run.extracted_data = data
        run.vendor_name = data.get("vendor_name")
        run.invoice_number = data.get("invoice_number")
        run.invoice_date = data.get("invoice_date")
        run.total = data.get("total")
        run.currency = data.get("currency")
        db.commit()
        await asyncio.sleep(STAGE_PACING_SECONDS)

        _add_stage(run, "Validating", "running", "Checking vendor status, PO match, duplicates, and amount tolerance...")
        db.commit()
        await asyncio.sleep(STAGE_PACING_SECONDS)

        checks, matched_po, decision = run_checks(db, run, extraction)
        run.matched_po_number = matched_po.po_number if matched_po else None
        _update_last_stage(run, "done", f"{len(checks)} checks completed.", data={"checks": checks})
        db.commit()
        await asyncio.sleep(STAGE_PACING_SECONDS)

        _add_stage(
            run, "Decision", "done",
            f"Final decision: {decision.upper()}",
            data={"decision": decision, "checks": checks, "matched_po": matched_po.po_number if matched_po else None},
        )
        run.decision_reasons = checks
        run.final_decision = decision
        run.status = decision
        db.commit()
    finally:
        db.close()
