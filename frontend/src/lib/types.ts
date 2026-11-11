export type RunStatus =
  | "queued"
  | "running"
  | "approved"
  | "flagged"
  | "rejected"
  | "error";

export type CheckVerdict = "pass" | "flag" | "reject" | "info";

export interface CheckResult {
  check: string;
  verdict: CheckVerdict;
  message: string;
}

export interface LineItem {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
}

export interface ExtractedInvoiceData {
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  currency: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  po_reference: string | null;
  line_items: LineItem[];
  missing_or_unclear_fields: string[];
  extraction_notes: string | null;
}

export interface ExtractionResult {
  method: "text" | "vision";
  data: ExtractedInvoiceData;
  raw_text_preview: string;
  confidence: number;
}

export type StageStatus = "running" | "done" | "error";

export interface Stage {
  name: string;
  status: StageStatus;
  detail: string;
  data: ExtractionResult | { checks: CheckResult[] } | Record<string, unknown> | null;
  started_at: string;
  finished_at: string | null;
}

export interface RunSummary {
  id: string;
  filename: string;
  created_at: string;
  status: RunStatus;
  scenario_label: string | null;
  vendor_name: string | null;
  invoice_number: string | null;
  total: number | null;
  currency: string | null;
  matched_po_number: string | null;
}

export interface RunDetail extends RunSummary {
  file_path: string | null;
  invoice_date: string | null;
  extracted_data: ExtractedInvoiceData | null;
  stages: Stage[];
  decision_reasons: CheckResult[];
  final_decision: string | null;
  error: string | null;
}

export interface PurchaseOrder {
  po_number: string;
  vendor_name: string;
  po_amount: number;
  currency: string;
  date_issued: string;
  tolerance_pct: number;
  description: string | null;
}

export interface Vendor {
  vendor_name: string;
  approved: boolean;
  tax_country: string | null;
}

export interface SampleInvoice {
  id: string;
  filename: string;
  label: string;
  description: string;
}
