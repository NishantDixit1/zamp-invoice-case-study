from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class RunSummary(BaseModel):
    id: str
    filename: str
    created_at: datetime
    status: str
    scenario_label: Optional[str] = None
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    total: Optional[float] = None
    currency: Optional[str] = None
    matched_po_number: Optional[str] = None

    class Config:
        from_attributes = True


class RunDetail(RunSummary):
    file_path: Optional[str] = None
    invoice_date: Optional[str] = None
    extracted_data: Optional[Any] = None
    stages: list = []
    decision_reasons: list = []
    final_decision: Optional[str] = None
    error: Optional[str] = None


class PurchaseOrderOut(BaseModel):
    po_number: str
    vendor_name: str
    po_amount: float
    currency: str
    date_issued: str
    tolerance_pct: float
    description: Optional[str] = None

    class Config:
        from_attributes = True


class VendorOut(BaseModel):
    vendor_name: str
    approved: bool
    tax_country: Optional[str] = None

    class Config:
        from_attributes = True


class SampleInvoiceOut(BaseModel):
    id: str
    filename: str
    label: str
    description: str
