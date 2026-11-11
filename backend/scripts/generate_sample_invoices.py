"""
Generates the sample invoice PDFs used to demo the case study, plus manifest.json
describing each scenario. Run with: python -m scripts.generate_sample_invoices
"""
import json
import sys
from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

OUT_DIR = BACKEND_DIR / "sample_data" / "invoices"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def build_invoice_pdf(
    path: Path,
    vendor_name: str,
    vendor_address: str,
    invoice_number: str | None,
    invoice_date: str | None,
    po_reference: str | None,
    line_items: list[tuple[str, float, float]],  # (description, qty, unit_price)
    tax_rate: float,
    currency_symbol: str = "$",
    note: str | None = None,
):
    c = canvas.Canvas(str(path), pagesize=letter)
    width, height = letter
    x_margin = 0.75 * inch
    y = height - 0.9 * inch

    c.setFont("Helvetica-Bold", 18)
    c.drawString(x_margin, y, vendor_name)
    y -= 0.25 * inch
    c.setFont("Helvetica", 9)
    for line in vendor_address.split("\n"):
        c.drawString(x_margin, y, line)
        y -= 0.15 * inch

    y -= 0.15 * inch
    c.setFont("Helvetica-Bold", 14)
    c.drawString(x_margin, y, "INVOICE")
    y -= 0.3 * inch

    c.setFont("Helvetica", 10)
    if invoice_number:
        c.drawString(x_margin, y, f"Invoice #: {invoice_number}")
        y -= 0.18 * inch
    if invoice_date:
        c.drawString(x_margin, y, f"Date: {invoice_date}")
        y -= 0.18 * inch
    if po_reference:
        c.drawString(x_margin, y, f"PO Reference: {po_reference}")
        y -= 0.18 * inch

    y -= 0.1 * inch
    c.drawString(x_margin, y, "Bill To: Acme Corp, 200 Market Street, San Francisco, CA")
    y -= 0.35 * inch

    c.setFont("Helvetica-Bold", 10)
    c.drawString(x_margin, y, "Description")
    c.drawString(x_margin + 3.2 * inch, y, "Qty")
    c.drawString(x_margin + 4.0 * inch, y, "Unit Price")
    c.drawString(x_margin + 5.3 * inch, y, "Amount")
    y -= 0.08 * inch
    c.line(x_margin, y, width - x_margin, y)
    y -= 0.22 * inch

    c.setFont("Helvetica", 10)
    subtotal = 0.0
    for desc, qty, unit_price in line_items:
        amount = qty * unit_price
        subtotal += amount
        c.drawString(x_margin, y, desc)
        c.drawRightString(x_margin + 3.6 * inch, y, f"{qty:g}")
        c.drawRightString(x_margin + 4.6 * inch, y, f"{currency_symbol}{unit_price:,.2f}")
        c.drawRightString(width - x_margin, y, f"{currency_symbol}{amount:,.2f}")
        y -= 0.22 * inch

    y -= 0.15 * inch
    c.line(x_margin + 3.5 * inch, y, width - x_margin, y)
    y -= 0.22 * inch

    tax = round(subtotal * tax_rate, 2)
    total = round(subtotal + tax, 2)

    c.drawString(x_margin + 3.5 * inch, y, "Subtotal")
    c.drawRightString(width - x_margin, y, f"{currency_symbol}{subtotal:,.2f}")
    y -= 0.2 * inch
    c.drawString(x_margin + 3.5 * inch, y, f"Tax ({tax_rate*100:.1f}%)")
    c.drawRightString(width - x_margin, y, f"{currency_symbol}{tax:,.2f}")
    y -= 0.2 * inch
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x_margin + 3.5 * inch, y, "Total Due")
    c.drawRightString(width - x_margin, y, f"{currency_symbol}{total:,.2f}")

    if note:
        y -= 0.5 * inch
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(x_margin, y, note)

    c.showPage()
    c.save()
    return total


def rasterize_to_scanned_look(src_path: Path, dest_path: Path):
    """Render the PDF's page(s) as images and rebuild a PDF with no text layer, simulating a scan."""
    import fitz  # PyMuPDF

    src = fitz.open(src_path)
    out = fitz.open()
    for page in src:
        pix = page.get_pixmap(dpi=150)
        jpeg_bytes = pix.tobytes("jpeg", jpg_quality=70)
        rect = page.rect
        new_page = out.new_page(width=rect.width, height=rect.height)
        new_page.insert_image(rect, stream=jpeg_bytes)
    out.save(dest_path)
    out.close()
    src.close()


def main():
    manifest = []

    # 1. Happy path: Brightline Office Supplies, PO-10234, exact match within tolerance
    path = OUT_DIR / "01_happy_path.pdf"
    build_invoice_pdf(
        path,
        vendor_name="Brightline Office Supplies",
        vendor_address="1180 Industrial Pkwy\nColumbus, OH 43085",
        invoice_number="INV-7001",
        invoice_date="2026-09-10",
        po_reference="PO-10234",
        line_items=[
            ("Standing desks (x6)", 6, 410.00),
            ("Ergonomic chairs (x6)", 6, 220.00),
            ("Monitor arms (x12)", 12, 87.00),
        ],
        tax_rate=0.0,
    )
    manifest.append({
        "id": "happy-path",
        "filename": path.name,
        "label": "Happy Path",
        "description": "Clean PDF, explicit PO reference, amount within tolerance. Should auto-approve.",
    })

    # 2. Scanned / image-only: Meridian IT Services, PO-10410
    text_src = OUT_DIR / "02_scanned_source.pdf"
    build_invoice_pdf(
        text_src,
        vendor_name="Meridian IT Services",
        vendor_address="88 Harborview Ave, Suite 400\nSeattle, WA 98101",
        invoice_number="INV-MI-552",
        invoice_date="2026-09-28",
        po_reference="PO-10410",
        line_items=[
            ("Managed IT retainer - September", 1, 12500.00),
            ("On-site support hours (x35)", 35, 95.00),
        ],
        tax_rate=0.0,
    )
    scanned_path = OUT_DIR / "02_scanned_invoice.pdf"
    rasterize_to_scanned_look(text_src, scanned_path)
    text_src.unlink()
    manifest.append({
        "id": "scanned-invoice",
        "filename": scanned_path.name,
        "label": "Scanned Invoice (no text layer)",
        "description": "Image-only PDF, forces vision-based extraction via Claude, and is always routed to human sign-off regardless of match quality.",
    })

    # 3. Missing critical fields: Alcove Facilities Group, implicit PO match
    path = OUT_DIR / "03_missing_fields.pdf"
    build_invoice_pdf(
        path,
        vendor_name="Alcove Facilities Group",
        vendor_address="440 Commerce Dr\nAustin, TX 78701",
        invoice_number=None,
        invoice_date=None,
        po_reference=None,
        line_items=[
            ("HVAC quarterly maintenance - Q3", 1, 2900.00),
        ],
        tax_rate=0.07,
        note="Thank you for your continued business.",
    )
    manifest.append({
        "id": "missing-fields",
        "filename": path.name,
        "label": "Missing Invoice Number / Date",
        "description": "No invoice number, date, or PO reference printed. Must fuzzy-match by vendor and gets flagged for the missing required fields.",
    })

    # 4. Split PO: Nordgate Logistics, PO-10777, two partial invoices
    path = OUT_DIR / "04a_split_po_part1.pdf"
    build_invoice_pdf(
        path,
        vendor_name="Nordgate Logistics",
        vendor_address="12 Dockside Rd\nVancouver, BC",
        invoice_number="INV-NL-2201",
        invoice_date="2026-09-05",
        po_reference="PO-10777",
        line_items=[("Warehouse transfer - Shipment 1 of 2", 1, 7000.00)],
        tax_rate=0.0,
    )
    manifest.append({
        "id": "split-po-1",
        "filename": path.name,
        "label": "Split PO | Shipment 1 of 2",
        "description": "First of two invoices against one PO. Should approve as a partial billing, with remaining balance tracked.",
    })

    path = OUT_DIR / "04b_split_po_part2.pdf"
    build_invoice_pdf(
        path,
        vendor_name="Nordgate Logistics",
        vendor_address="12 Dockside Rd\nVancouver, BC",
        invoice_number="INV-NL-2244",
        invoice_date="2026-09-19",
        po_reference="PO-10777",
        line_items=[("Warehouse transfer - Shipment 2 of 2", 1, 5000.00)],
        tax_rate=0.0,
    )
    manifest.append({
        "id": "split-po-2",
        "filename": path.name,
        "label": "Split PO | Shipment 2 of 2 (run after part 1)",
        "description": "Second invoice completes the PO exactly. Cumulative total must be checked against prior invoices, not just this one.",
    })

    # 5. Duplicate: Solara Print & Media, PO-10890 (same file submitted twice)
    path = OUT_DIR / "05_duplicate_invoice.pdf"
    build_invoice_pdf(
        path,
        vendor_name="Solara Print & Media",
        vendor_address="900 Printers Row\nChicago, IL 60607",
        invoice_number="INV-SP-3390",
        invoice_date="2026-09-22",
        po_reference="PO-10890",
        line_items=[("Q4 campaign print run - 5,000 units", 1, 2273.00)],
        tax_rate=0.0,
    )
    manifest.append({
        "id": "duplicate-1st",
        "filename": path.name,
        "label": "Duplicate Invoice | 1st submission",
        "description": "Run this first. Should approve normally.",
    })
    manifest.append({
        "id": "duplicate-2nd",
        "filename": path.name,
        "label": "Duplicate Invoice | 2nd submission (run after 1st)",
        "description": "Identical invoice number + vendor submitted again. Should reject as a duplicate, citing the original run.",
    })

    # Bonus (not one of the 4 required edge cases): unapproved vendor, hard reject
    path = OUT_DIR / "06_bonus_unapproved_vendor.pdf"
    build_invoice_pdf(
        path,
        vendor_name="Quickline Freight Unverified",
        vendor_address="(no verified business address on file)",
        invoice_number="INV-QF-100",
        invoice_date="2026-09-12",
        po_reference=None,
        line_items=[("Expedited freight", 1, 800.00)],
        tax_rate=0.0,
    )
    manifest.append({
        "id": "bonus-unapproved-vendor",
        "filename": path.name,
        "label": "Bonus: Unapproved Vendor",
        "description": "Not one of the 4 required edge cases. Extra scenario showing a hard REJECT when the vendor itself isn't cleared for payment.",
    })

    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"Generated {len(manifest)} sample invoice entries into {OUT_DIR}")


if __name__ == "__main__":
    main()
