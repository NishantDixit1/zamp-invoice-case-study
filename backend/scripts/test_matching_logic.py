"""
Exercises the rule-based matching/decision logic directly with hand-built
extraction payloads, bypassing the live Claude call. Run with:
    python -m scripts.test_matching_logic
"""
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

TEST_DB = BACKEND_DIR / "test_matching.db"
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"

from app.database import Base, engine, SessionLocal  # noqa: E402
from app.models import InvoiceRun  # noqa: E402
from app.seed_data import seed  # noqa: E402
from app.matching import run_checks  # noqa: E402


def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed(db)
    return db


def make_extraction(method="text", confidence=0.95, **fields):
    base = {
        "vendor_name": None, "invoice_number": None, "invoice_date": None,
        "currency": "USD", "subtotal": None, "tax": None, "total": None,
        "po_reference": None, "line_items": [], "missing_or_unclear_fields": [],
        "extraction_notes": "",
    }
    base.update(fields)
    return {"method": method, "data": base, "raw_text_preview": "", "confidence": confidence}


def run_case(db, label, extraction, expect_decision):
    run = InvoiceRun(filename=f"{label}.pdf", status="running", stages=[], decision_reasons=[])
    db.add(run)
    db.commit()
    db.refresh(run)

    checks, matched_po, decision = run_checks(db, run, extraction)

    run.vendor_name = extraction["data"]["vendor_name"]
    run.invoice_number = extraction["data"]["invoice_number"]
    run.total = extraction["data"]["total"]
    run.matched_po_number = matched_po.po_number if matched_po else None
    run.status = decision
    run.decision_reasons = checks
    db.commit()

    ok = decision == expect_decision
    tag = "PASS" if ok else "FAIL"
    print(f"[{tag}] {label}: expected={expect_decision} got={decision}"
          f" (po={run.matched_po_number})")
    if not ok:
        for c in checks:
            print(f"        - {c['check']}: {c['verdict']} | {c['message']}")
    return run


def main():
    db = fresh_db()

    run_case(db, "happy-path",
              make_extraction(vendor_name="Brightline Office Supplies", invoice_number="INV-7001",
                               invoice_date="2026-09-10", po_reference="PO-10234", total=4824.00),
              expect_decision="approved")

    run_case(db, "scanned-invoice",
              make_extraction(method="vision", confidence=0.74,
                               vendor_name="Meridian IT Services", invoice_number="INV-MI-552",
                               invoice_date="2026-09-28", po_reference="PO-10410", total=15825.00),
              expect_decision="flagged")  # vision source always flags regardless of clean match

    run_case(db, "missing-fields",
              make_extraction(vendor_name="Alcove Facilities Group", total=3103.00,
                               missing_or_unclear_fields=["invoice_number", "invoice_date"]),
              expect_decision="flagged")

    split1 = run_case(db, "split-po-1",
              make_extraction(vendor_name="Nordgate Logistics", invoice_number="INV-NL-2201",
                               invoice_date="2026-09-05", po_reference="PO-10777", total=7000.00),
              expect_decision="approved")

    split2 = run_case(db, "split-po-2",
              make_extraction(vendor_name="Nordgate Logistics", invoice_number="INV-NL-2244",
                               invoice_date="2026-09-19", po_reference="PO-10777", total=5000.00),
              expect_decision="approved")
    assert split2.matched_po_number == "PO-10777"

    dup1 = run_case(db, "duplicate-1st",
              make_extraction(vendor_name="Solara Print & Media", invoice_number="INV-SP-3390",
                               invoice_date="2026-09-22", po_reference="PO-10890", total=2273.00),
              expect_decision="approved")

    run_case(db, "duplicate-2nd",
              make_extraction(vendor_name="Solara Print & Media", invoice_number="INV-SP-3390",
                               invoice_date="2026-09-22", po_reference="PO-10890", total=2273.00),
              expect_decision="rejected")

    run_case(db, "bonus-unapproved-vendor",
              make_extraction(vendor_name="Quickline Freight Unverified", invoice_number="INV-QF-100",
                               invoice_date="2026-09-12", total=800.00),
              expect_decision="rejected")

    run_case(db, "over-tolerance",
              make_extraction(vendor_name="Fenwick & Cole Legal", invoice_number="INV-FC-900",
                               invoice_date="2026-07-20", po_reference="PO-10915", total=9800.00),
              expect_decision="flagged")  # 9800 vs PO 9500, 1% tolerance -> over

    db.close()
    TEST_DB.unlink()


if __name__ == "__main__":
    main()
