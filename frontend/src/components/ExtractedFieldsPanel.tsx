import type { ExtractedInvoiceData } from "@/lib/types";
import { formatMoney } from "@/lib/format";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-data text-[10px] uppercase tracking-widest text-ink-soft">{label}</dt>
      <dd className="text-sm text-ink mt-0.5">{value}</dd>
    </div>
  );
}

export function ExtractedFieldsPanel({ data }: { data: ExtractedInvoiceData }) {
  return (
    <div className="rounded-md border border-line bg-paper-raised p-4">
      <h2 className="font-display text-sm font-semibold text-ink">Extracted fields</h2>

      <dl className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Vendor" value={data.vendor_name ?? "-"} />
        <Field label="Invoice #" value={data.invoice_number ?? "-"} />
        <Field label="Date" value={data.invoice_date ?? "-"} />
        <Field label="PO reference" value={data.po_reference ?? "(not printed)"} />
        <Field label="Subtotal" value={formatMoney(data.subtotal, data.currency)} />
        <Field label="Tax" value={formatMoney(data.tax, data.currency)} />
        <Field label="Total" value={formatMoney(data.total, data.currency)} />
      </dl>

      {data.line_items?.length > 0 && (
        <div className="mt-4">
          <h3 className="font-data text-[10px] uppercase tracking-widest text-ink-soft">
            Line items
          </h3>
          <table className="w-full mt-1.5 text-sm">
            <tbody>
              {data.line_items.map((item, i) => (
                <tr key={i} className="border-t border-line first:border-0">
                  <td className="py-1.5 pr-2 text-ink">{item.description}</td>
                  <td className="py-1.5 pr-2 text-right font-data text-ink-soft tabular-nums">
                    {item.quantity ?? "-"}
                  </td>
                  <td className="py-1.5 text-right font-data text-ink tabular-nums">
                    {item.amount !== null ? formatMoney(item.amount, data.currency) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.missing_or_unclear_fields?.length > 0 && (
        <div className="mt-4 rounded-sm bg-flagged-soft px-3 py-2">
          <p className="font-data text-[10px] uppercase tracking-widest text-flagged">
            Missing or unclear
          </p>
          <p className="text-sm text-ink mt-0.5">
            {data.missing_or_unclear_fields.join(", ")}
          </p>
        </div>
      )}

      {data.extraction_notes && (
        <p className="mt-3 text-xs italic text-ink-soft">{data.extraction_notes}</p>
      )}
    </div>
  );
}
