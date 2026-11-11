import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, Boolean, DateTime, JSON, Integer

from app.database import Base


def gen_id() -> str:
    return uuid.uuid4().hex[:12]


class Vendor(Base):
    __tablename__ = "vendors"

    vendor_name = Column(String, primary_key=True)
    approved = Column(Boolean, default=True)
    tax_country = Column(String, nullable=True)


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    po_number = Column(String, primary_key=True)
    vendor_name = Column(String, index=True)
    po_amount = Column(Float)
    currency = Column(String, default="USD")
    date_issued = Column(String)
    tolerance_pct = Column(Float, default=2.0)
    description = Column(String, nullable=True)


class InvoiceRun(Base):
    __tablename__ = "invoice_runs"

    id = Column(String, primary_key=True, default=gen_id)
    filename = Column(String)
    file_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="queued")  # queued -> running -> approved/flagged/rejected/error
    scenario_label = Column(String, nullable=True)  # which edge case this was, for demo narration

    vendor_name = Column(String, nullable=True)
    invoice_number = Column(String, nullable=True)
    invoice_date = Column(String, nullable=True)
    total = Column(Float, nullable=True)
    currency = Column(String, nullable=True)
    matched_po_number = Column(String, nullable=True)

    extracted_data = Column(JSON, nullable=True)
    stages = Column(JSON, default=list)  # list of {name, status, detail, data, started_at, finished_at}
    decision_reasons = Column(JSON, default=list)  # list of {check, verdict, message}
    final_decision = Column(String, nullable=True)
    error = Column(String, nullable=True)
