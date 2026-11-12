import type { ExtractedInvoiceData } from "@/lib/types";
import { formatMoney } from "@/lib/format";

/**
 * Fields are laid out as label/value rows on hairline rules, the way a form
 * transcription would be, so they line up against the document beside them.
 */
function Field({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 items-baseline border-t border-line py-2">
      <dt className="caption">{label}</dt>
      <dd className={`font-data text-[13px] ${dim ? "text-ink-soft" : "text-ink"}`}>{value}</dd>
    </div>
  );
}

export function ExtractedFieldsPanel({ data }: { data: ExtractedInvoiceData }) {
  return (
    <section className="border border-line bg-paper-raised">
      <header className="flex items-center justify-between border-b border-line px-4 h-10">
        <h2 className="caption">Extracted fields</h2>
        {data.missing_or_unclear_fields?.length > 0 && (
          <span className="caption" style={{ color: "var(--flagged)" }}>
            {data.missing_or_unclear_fields.length} unclear
          </span>
        )}
      </header>

      <dl className="px-4 pb-2">
        <Field label="Vendor" value={data.vendor_name ?? "not found"} dim={!data.vendor_name} />
        <Field label="Invoice no." value={data.invoice_number ?? "not found"} dim={!data.invoice_number} />
        <Field label="Date" value={data.invoice_date ?? "not found"} dim={!data.invoice_date} />
        <Field
          label="PO reference"
          value={data.po_reference ?? "not printed"}
          dim={!data.po_reference}
        />
        <Field label="Subtotal" value={formatMoney(data.subtotal, data.currency)} />
        <Field label="Tax" value={formatMoney(data.tax, data.currency)} />
        <Field label="Total" value={formatMoney(data.total, data.currency)} />
      </dl>

      {data.line_items?.length > 0 && (
        <div className="border-t border-line-strong px-4 py-3">
          <h3 className="caption">Line items</h3>
          <table className="w-full mt-2 font-data text-[13px]">
            <tbody>
              {data.line_items.map((item, i) => (
                <tr key={i} className="border-t border-line first:border-0">
                  <td className="py-1.5 pr-3 font-body text-ink">{item.description}</td>
                  <td className="py-1.5 pr-3 text-right text-ink-soft tabular-nums w-12">
                    {item.quantity ?? "-"}
                  </td>
                  <td className="py-1.5 text-right text-ink tabular-nums w-28">
                    {item.amount !== null ? formatMoney(item.amount, data.currency) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.missing_or_unclear_fields?.length > 0 && (
        <div
          className="border-t border-line px-4 py-3"
          style={{ backgroundColor: "var(--flagged-soft)" }}
        >
          <p className="caption" style={{ color: "var(--flagged)" }}>
            Missing or unclear
          </p>
          <p className="font-data text-[13px] text-ink mt-1">
            {data.missing_or_unclear_fields.join(", ")}
          </p>
        </div>
      )}

      {data.extraction_notes && (
        <p className="border-t border-line px-4 py-3 text-xs text-ink-soft leading-relaxed">
          {data.extraction_notes}
        </p>
      )}
    </section>
  );
}
