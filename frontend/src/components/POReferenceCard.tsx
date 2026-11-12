import type { PurchaseOrder } from "@/lib/types";
import { formatMoney } from "@/lib/format";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 items-baseline border-t border-line py-2">
      <dt className="caption">{label}</dt>
      <dd className="font-data text-[13px] text-ink">{value}</dd>
    </div>
  );
}

export function POReferenceCard({ po }: { po: PurchaseOrder | null }) {
  return (
    <section className="border border-line bg-paper-raised">
      <header className="flex items-center justify-between border-b border-line px-4 h-10">
        <h2 className="caption">Matched purchase order</h2>
        {po && <span className="font-data text-[11px] text-accent">{po.po_number}</span>}
      </header>

      {po ? (
        <>
          <dl className="px-4 pb-2">
            <Row label="Vendor" value={po.vendor_name} />
            <Row label="PO amount" value={formatMoney(po.po_amount, po.currency)} />
            <Row label="Tolerance" value={`${po.tolerance_pct}%`} />
            <Row label="Issued" value={po.date_issued} />
          </dl>
          {po.description && (
            <p className="border-t border-line px-4 py-3 text-xs text-ink-soft leading-relaxed">
              {po.description}
            </p>
          )}
        </>
      ) : (
        <p className="px-4 py-4 text-sm text-ink-soft">
          No purchase order was matched to this invoice.
        </p>
      )}
    </section>
  );
}
