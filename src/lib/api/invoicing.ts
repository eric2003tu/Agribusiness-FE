import { apiRequest, buildQueryString, type ApiPage } from "./client";
import type { ApiInvoice, ApiInvoiceLine, InvoiceStatus } from "./types";

/* --------------------------------- Invoices -------------------------------- */
/* Readable by issuer/recipient; writes need staff. */

export function listInvoicesApi(params?: {
  order?: number;
  issuer_user?: number;
  issuer_org?: number;
  recipient_user?: number;
  recipient_org?: number;
  status?: InvoiceStatus;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiInvoice>>(`invoices/${buildQueryString(params)}`);
}

export function getInvoiceApi(id: number) {
  return apiRequest<ApiInvoice>(`invoices/${id}/`);
}

/** Exactly one of `issuer_user`/`issuer_org` and one of `recipient_user`/`recipient_org`
 * required. All four, plus `order`/`inv_number`, are immutable after creation. Staff only. */
export interface InvoiceCreatePayload {
  inv_number: string;
  order: number;
  currency: number;
  subtotal: string;
  grand_total: string;
  issuer_user?: number | null;
  issuer_org?: number | null;
  recipient_user?: number | null;
  recipient_org?: number | null;
  status?: InvoiceStatus;
  tax_total?: string;
  amount_paid?: string;
  issued_at?: string | null;
  due_at?: string | null;
  paid_at?: string | null;
}

export function createInvoiceApi(payload: InvoiceCreatePayload) {
  return apiRequest<ApiInvoice>("invoices/", { method: "POST", body: payload });
}

export interface InvoiceUpdatePayload {
  currency: number;
  subtotal: string;
  grand_total: string;
  status?: InvoiceStatus;
  tax_total?: string;
  amount_paid?: string;
  issued_at?: string | null;
  due_at?: string | null;
  paid_at?: string | null;
}

export function updateInvoiceApi(id: number, payload: InvoiceUpdatePayload) {
  return apiRequest<ApiInvoice>(`invoices/${id}/`, { method: "PUT", body: payload });
}

export function patchInvoiceApi(id: number, payload: Partial<InvoiceUpdatePayload>) {
  return apiRequest<ApiInvoice>(`invoices/${id}/`, { method: "PATCH", body: payload });
}

export function deleteInvoiceApi(id: number) {
  return apiRequest<void>(`invoices/${id}/`, { method: "DELETE" });
}

/* --------------------------------- Invoice lines -------------------------------- */
/* Readable by the parent invoice's issuer/recipient; writes need staff. */

export function listInvoiceLinesApi(params?: { invoice?: number; order_line?: number; page_size?: number }) {
  return apiRequest<ApiPage<ApiInvoiceLine>>(`invoice-lines/${buildQueryString(params)}`);
}

export function getInvoiceLineApi(id: number) {
  return apiRequest<ApiInvoiceLine>(`invoice-lines/${id}/`);
}

export interface InvoiceLinePayload {
  invoice: number;
  order_line: number;
  description: string;
  quantity: string;
  unit_price: string;
  line_total: string;
}

export function createInvoiceLineApi(payload: InvoiceLinePayload) {
  return apiRequest<ApiInvoiceLine>("invoice-lines/", { method: "POST", body: payload });
}

export function updateInvoiceLineApi(id: number, payload: InvoiceLinePayload) {
  return apiRequest<ApiInvoiceLine>(`invoice-lines/${id}/`, { method: "PUT", body: payload });
}

export function patchInvoiceLineApi(id: number, payload: Partial<InvoiceLinePayload>) {
  return apiRequest<ApiInvoiceLine>(`invoice-lines/${id}/`, { method: "PATCH", body: payload });
}

export function deleteInvoiceLineApi(id: number) {
  return apiRequest<void>(`invoice-lines/${id}/`, { method: "DELETE" });
}
