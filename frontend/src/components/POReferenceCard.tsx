import type { PurchaseOrder } from "@/lib/types";
import { formatMoney } from "@/lib/format";

export function POReferenceCard({ po }: { po: PurchaseOrder | null }) {
  if (!po) {
    return (
      <div className="rounded-md border border-dashed border-line p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Matched PO</h2>
        <p className="mt-2 text-sm text-ink-soft">No purchase order matched to this invoice.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line bg-paper-raised p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-ink">Matched PO</h2>
        <span className="font-data text-xs text-accent">{po.po_number}</span>
      </div>
      <p className="mt-2 text-sm text-ink">{po.vendor_name}</p>
      <p className="text-xs text-ink-soft mt-0.5">{po.description}</p>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <dt className="font-data text-[10px] uppercase tracking-widest text-ink-soft">
            PO amount
          </dt>
          <dd className="text-sm font-data tabular-nums text-ink mt-0.5">
            {formatMoney(po.po_amount, po.currency)}
          </dd>
        </div>
        <div>
          <dt className="font-data text-[10px] uppercase tracking-widest text-ink-soft">
            Tolerance
          </dt>
          <dd className="text-sm font-data tabular-nums text-ink mt-0.5">{po.tolerance_pct}%</dd>
        </div>
        <div>
          <dt className="font-data text-[10px] uppercase tracking-widest text-ink-soft">
            Issued
          </dt>
          <dd className="text-sm font-data text-ink mt-0.5">{po.date_issued}</dd>
        </div>
      </dl>
    </div>
  );
}
