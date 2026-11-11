import type {
  PurchaseOrder,
  RunDetail,
  RunSummary,
  SampleInvoice,
  Vendor,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8123";

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(body || res.statusText, res.status);
  }
  return res.json() as Promise<T>;
}

export function listRuns(): Promise<RunSummary[]> {
  return request<RunSummary[]>("/api/runs");
}

export function getRun(id: string): Promise<RunDetail> {
  return request<RunDetail>(`/api/runs/${id}`);
}

export function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  return request<PurchaseOrder[]>("/api/pos");
}

export function listVendors(): Promise<Vendor[]> {
  return request<Vendor[]>("/api/vendors");
}

export function listSampleInvoices(): Promise<SampleInvoice[]> {
  return request<SampleInvoice[]>("/api/sample-invoices");
}

export async function uploadInvoice(file: File): Promise<RunSummary> {
  const form = new FormData();
  form.append("file", file);
  return request<RunSummary>("/api/runs", { method: "POST", body: form });
}

export function runFromSample(sampleId: string): Promise<RunSummary> {
  return request<RunSummary>(`/api/runs/from-sample/${sampleId}`, { method: "POST" });
}

export function resetDemoData(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/admin/reset", { method: "POST" });
}

export { ApiError };
