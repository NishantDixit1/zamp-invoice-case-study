from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Vendor, PurchaseOrder, InvoiceRun

CRITICAL_FIELDS = ["invoice_number", "invoice_date", "total"]

SEVERITY = {"pass": 0, "info": 0, "flag": 1, "reject": 2}


def check(name: str, verdict: str, message: str) -> dict:
    return {"check": name, "verdict": verdict, "message": message}


def run_checks(db: Session, run: InvoiceRun, extraction: dict):
    data = extraction["data"]
    method = extraction["method"]
    checks = []

    vendor_name = (data.get("vendor_name") or "").strip() or None
    invoice_number = (data.get("invoice_number") or "").strip() or None
    total = data.get("total")
    matched_po = None

    # 1. Required fields
    missing_critical = [f for f in CRITICAL_FIELDS if not data.get(f)]
    if missing_critical:
        checks.append(check(
            "Required Fields",
            "flag",
            f"Missing critical field(s): {', '.join(missing_critical)}. "
            f"Cannot reliably auto-process without these, routing to manual review."
        ))
    else:
        checks.append(check("Required Fields", "pass", "Invoice number, date, and total are all present."))

    # 2. Vendor check
    if not vendor_name:
        checks.append(check("Vendor Check", "flag", "No vendor name could be extracted from the document."))
    else:
        vendor = db.query(Vendor).filter(Vendor.vendor_name.ilike(vendor_name)).first()
        if vendor is None:
            checks.append(check(
                "Vendor Check", "flag",
                f"'{vendor_name}' is not in the vendor master list. Treating as unverified until procurement adds it."
            ))
        elif not vendor.approved:
            checks.append(check(
                "Vendor Check", "reject",
                f"'{vendor_name}' is a known vendor but is NOT approved for payment. Blocked until procurement clears it."
            ))
        else:
            checks.append(check("Vendor Check", "pass", f"'{vendor_name}' is an approved vendor."))

    # 3. PO matching
    po_reference = (data.get("po_reference") or "").strip() or None
    if po_reference:
        po = db.query(PurchaseOrder).filter(PurchaseOrder.po_number.ilike(po_reference)).first()
        if po is None:
            checks.append(check(
                "PO Matching", "flag",
                f"Invoice references {po_reference}, but no PO with that number exists in the procurement system."
            ))
        elif vendor_name and po.vendor_name.lower() not in vendor_name.lower() and vendor_name.lower() not in po.vendor_name.lower():
            checks.append(check(
                "PO Matching", "flag",
                f"Invoice cites {po_reference}, but that PO belongs to '{po.vendor_name}', not '{vendor_name}'. Needs manual verification."
            ))
        else:
            matched_po = po
            checks.append(check(
                "PO Matching", "pass",
                f"Matched to {po.po_number} by explicit PO reference printed on the invoice."
            ))
    elif vendor_name:
        candidates = db.query(PurchaseOrder).filter(PurchaseOrder.vendor_name.ilike(vendor_name)).all()
        if len(candidates) == 0:
            checks.append(check(
                "PO Matching", "flag",
                f"No PO number printed on the invoice, and no open PO found for '{vendor_name}'. Cannot validate spend without a PO."
            ))
        elif len(candidates) == 1:
            matched_po = candidates[0]
            checks.append(check(
                "PO Matching", "flag",
                f"No PO number printed on the invoice. Matched by vendor name to the only open PO for '{vendor_name}' "
                f"({matched_po.po_number}), confirm before paying."
            ))
        else:
            matched_po = min(candidates, key=lambda p: abs(p.po_amount - (total or 0)))
            checks.append(check(
                "PO Matching", "flag",
                f"No PO number printed, and {len(candidates)} open POs exist for '{vendor_name}'. "
                f"Matched to {matched_po.po_number} as the closest amount match. Ambiguous, confirm before paying."
            ))
    else:
        checks.append(check("PO Matching", "flag", "Cannot attempt PO matching without a vendor name."))

    # 4. Duplicate check
    if invoice_number and vendor_name:
        dup = (
            db.query(InvoiceRun)
            .filter(
                InvoiceRun.id != run.id,
                InvoiceRun.vendor_name.ilike(vendor_name),
                InvoiceRun.invoice_number == invoice_number,
                InvoiceRun.status.in_(["approved", "flagged"]),
            )
            .first()
        )
        if dup:
            checks.append(check(
                "Duplicate Check", "reject",
                f"Invoice {invoice_number} from '{vendor_name}' was already processed as run {dup.id} "
                f"(status: {dup.status}) on {dup.created_at:%Y-%m-%d %H:%M}. Rejecting as a duplicate submission."
            ))
        else:
            checks.append(check("Duplicate Check", "pass", "No prior invoice found with this vendor + invoice number."))
    else:
        checks.append(check(
            "Duplicate Check", "flag",
            "Cannot run duplicate detection reliably without both a vendor name and an invoice number."
        ))

    # 5. Amount / tolerance validation (only meaningful if we matched a PO and have a total)
    if matched_po and total is not None:
        prior_runs = (
            db.query(InvoiceRun)
            .filter(
                InvoiceRun.id != run.id,
                InvoiceRun.matched_po_number == matched_po.po_number,
                InvoiceRun.status.in_(["approved", "flagged"]),
            )
            .all()
        )
        cumulative_prior = sum(r.total or 0 for r in prior_runs)
        cumulative_with_this = cumulative_prior + total
        allowed_max = matched_po.po_amount * (1 + matched_po.tolerance_pct / 100)

        if cumulative_with_this <= allowed_max:
            if cumulative_with_this < matched_po.po_amount * 0.999 and total < matched_po.po_amount * 0.999:
                checks.append(check(
                    "Amount Validation", "pass",
                    f"Partial billing against {matched_po.po_number}: ${cumulative_with_this:,.2f} of "
                    f"${matched_po.po_amount:,.2f} invoiced so far (prior invoices: ${cumulative_prior:,.2f}). "
                    f"Remaining balance still available for future invoices on this PO."
                ))
            else:
                diff_pct = abs(cumulative_with_this - matched_po.po_amount) / matched_po.po_amount * 100
                checks.append(check(
                    "Amount Validation", "pass",
                    f"${cumulative_with_this:,.2f} matches PO amount ${matched_po.po_amount:,.2f} "
                    f"within {diff_pct:.2f}% (tolerance {matched_po.tolerance_pct}%)."
                ))
        else:
            over_pct = (cumulative_with_this - matched_po.po_amount) / matched_po.po_amount * 100
            checks.append(check(
                "Amount Validation", "flag",
                f"Cumulative invoiced against {matched_po.po_number} (${cumulative_with_this:,.2f}, including "
                f"${cumulative_prior:,.2f} already on file) exceeds the PO amount (${matched_po.po_amount:,.2f}) "
                f"by {over_pct:.1f}%, beyond the {matched_po.tolerance_pct}% tolerance. Needs manual approval."
            ))
    else:
        checks.append(check(
            "Amount Validation", "flag" if total is None else "info",
            "Skipped, no confidently matched PO and/or total to validate against."
            if total is not None else "Skipped, no total extracted to validate."
        ))

    # 6. Extraction method / confidence
    if method == "vision":
        checks.append(check(
            "Source Document", "flag",
            f"Extracted via scanned-image reading (confidence {extraction['confidence']:.0%}), not machine text. "
            f"Policy: scanned invoices always route to human sign-off before payment, regardless of match quality."
        ))
    else:
        checks.append(check(
            "Source Document", "pass",
            f"Machine-readable PDF text, extraction confidence {extraction['confidence']:.0%}."
        ))

    # Aggregate final decision
    worst = max((SEVERITY[c["verdict"]] for c in checks), default=0)
    final_decision = {0: "approved", 1: "flagged", 2: "rejected"}[worst]

    return checks, matched_po, final_decision
