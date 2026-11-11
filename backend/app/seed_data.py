import json

from sqlalchemy.orm import Session

from app.config import SAMPLE_DATA_DIR
from app.models import Vendor, PurchaseOrder


def seed(db: Session):
    if db.query(Vendor).count() == 0:
        vendors = json.loads((SAMPLE_DATA_DIR / "vendors.json").read_text())
        for v in vendors:
            db.add(Vendor(**v))

    if db.query(PurchaseOrder).count() == 0:
        pos = json.loads((SAMPLE_DATA_DIR / "purchase_orders.json").read_text())
        for po in pos:
            db.add(PurchaseOrder(**po))

    db.commit()
