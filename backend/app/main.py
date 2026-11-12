import asyncio
import json
import shutil
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.config import UPLOADS_DIR, SAMPLE_DATA_DIR
from app.database import Base, engine, get_db, SessionLocal
from app.models import InvoiceRun, PurchaseOrder, Vendor
from app.schemas import RunSummary, RunDetail, PurchaseOrderOut, VendorOut, SampleInvoiceOut
from app.seed_data import seed
from app.pipeline import process_run

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Zamp Invoice Processing Case Study")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


@app.post("/api/runs", response_model=RunSummary)
async def create_run(
    file: UploadFile = File(...),
    scenario_label: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    run = InvoiceRun(filename=file.filename, status="queued", scenario_label=scenario_label, stages=[], decision_reasons=[])
    db.add(run)
    db.commit()
    db.refresh(run)

    dest = UPLOADS_DIR / f"{run.id}_{file.filename}"
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    run.file_path = str(dest)
    db.commit()
    db.refresh(run)

    asyncio.create_task(process_run(run.id))
    return run


@app.post("/api/runs/from-sample/{sample_id}", response_model=RunSummary)
async def create_run_from_sample(sample_id: str, db: Session = Depends(get_db)):
    manifest = json.loads((SAMPLE_DATA_DIR / "invoices" / "manifest.json").read_text())
    entry = next((m for m in manifest if m["id"] == sample_id), None)
    if entry is None:
        raise HTTPException(404, "Unknown sample invoice")

    src = SAMPLE_DATA_DIR / "invoices" / entry["filename"]
    if not src.exists():
        raise HTTPException(404, f"Sample file {entry['filename']} not found on disk")

    run = InvoiceRun(
        filename=entry["filename"], status="queued",
        scenario_label=entry["label"], stages=[], decision_reasons=[],
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    dest = UPLOADS_DIR / f"{run.id}_{entry['filename']}"
    shutil.copyfile(src, dest)
    run.file_path = str(dest)
    db.commit()
    db.refresh(run)

    asyncio.create_task(process_run(run.id))
    return run


@app.get("/api/runs", response_model=list[RunSummary])
def list_runs(db: Session = Depends(get_db)):
    return db.query(InvoiceRun).order_by(InvoiceRun.created_at.desc()).all()


@app.get("/api/runs/{run_id}", response_model=RunDetail)
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(InvoiceRun).filter(InvoiceRun.id == run_id).first()
    if run is None:
        raise HTTPException(404, "Run not found")
    return run


def _run_file_path(run_id: str, db: Session) -> Path:
    """Resolve a run's stored PDF, refusing anything outside the uploads directory."""
    run = db.query(InvoiceRun).filter(InvoiceRun.id == run_id).first()
    if run is None or not run.file_path:
        raise HTTPException(404, "Run not found")

    path = Path(run.file_path).resolve()
    if not path.is_file() or UPLOADS_DIR.resolve() not in path.parents:
        raise HTTPException(404, "Invoice file is no longer on disk")
    return path


@app.get("/api/runs/{run_id}/file")
def get_run_file(run_id: str, db: Session = Depends(get_db)):
    """Serve the original invoice PDF so a reviewer can read it next to the decision."""
    run = db.query(InvoiceRun).filter(InvoiceRun.id == run_id).first()
    path = _run_file_path(run_id, db)
    return FileResponse(path, media_type="application/pdf", filename=run.filename)


@app.get("/api/runs/{run_id}/document")
def get_run_document_meta(run_id: str, db: Session = Depends(get_db)):
    """Page count for the viewer, so it can show pager controls without fetching an image."""
    import fitz  # PyMuPDF

    path = _run_file_path(run_id, db)
    doc = fitz.open(path)
    try:
        return {"page_count": doc.page_count}
    finally:
        doc.close()


@app.get("/api/runs/{run_id}/preview")
def get_run_preview(run_id: str, page: int = 0, db: Session = Depends(get_db)):
    """
    Render a page of the invoice to PNG. Browsers vary a lot in whether they
    will display an embedded PDF inline, so the UI shows this image and keeps
    the raw PDF behind a download link.
    """
    import fitz  # PyMuPDF

    path = _run_file_path(run_id, db)
    doc = fitz.open(path)
    try:
        page_count = doc.page_count
        if page < 0 or page >= page_count:
            raise HTTPException(404, "Page out of range")
        pixmap = doc.load_page(page).get_pixmap(dpi=130)
        png_bytes = pixmap.tobytes("png")
    finally:
        doc.close()

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={
            "X-Page-Count": str(page_count),
            "Access-Control-Expose-Headers": "X-Page-Count",
        },
    )


@app.get("/api/pos", response_model=list[PurchaseOrderOut])
def list_pos(db: Session = Depends(get_db)):
    return db.query(PurchaseOrder).all()


@app.get("/api/vendors", response_model=list[VendorOut])
def list_vendors(db: Session = Depends(get_db)):
    return db.query(Vendor).all()


@app.get("/api/sample-invoices", response_model=list[SampleInvoiceOut])
def list_sample_invoices():
    manifest_path = SAMPLE_DATA_DIR / "invoices" / "manifest.json"
    if not manifest_path.exists():
        return []
    return json.loads(manifest_path.read_text())


@app.post("/api/admin/reset")
def reset_runs(db: Session = Depends(get_db)):
    db.query(InvoiceRun).delete()
    db.commit()
    for f in UPLOADS_DIR.glob("*"):
        if f.is_file():
            f.unlink()
    return {"ok": True}
