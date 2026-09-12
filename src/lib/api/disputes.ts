import { apiRequest, buildQueryString, type ApiPage } from "./client";
import type { ApiDispute, ApiReturnLine, ApiReturnRequest, DisputeStatus, ReturnReason, ReturnStatus } from "./types";

/* --------------------------------- Return requests -------------------------------- */
/* Visible to whoever filed it, or the order's other party; staff see all. */

export function listReturnRequestsApi(params?: {
  order?: number;
  user?: number;
  org?: number;
  reason?: ReturnReason;
  status?: ReturnStatus;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiReturnRequest>>(`return-requests/${buildQueryString(params)}`);
}

export function getReturnRequestApi(id: number) {
  return apiRequest<ApiReturnRequest>(`return-requests/${id}/`);
}

/** Exactly one of `user`/`org` required (must be the caller or an org they belong to);
 * `order`/`user`/`org`/`return_number` are immutable after creation. */
export interface ReturnRequestCreatePayload {
  return_number: string;
  order: number;
  reason: ReturnReason;
  user?: number | null;
  org?: number | null;
  refund_amount?: string | null;
}

/** The create response omits `status`/`requested_at`/`resolved_at`, even though
 * `status` defaults to `"requested"` and `requested_at` is stamped server-side
 * — confirmed by directly testing the live server. */
export function createReturnRequestApi(payload: ReturnRequestCreatePayload) {
  return apiRequest<Omit<ApiReturnRequest, "status" | "requested_at" | "resolved_at">>("return-requests/", {
    method: "POST",
    body: payload,
  });
}

/** Unlike Dispute, `status`/`resolved_at` are plain editable fields here — writable by
 * either party, not staff-gated (no dedicated `resolve` action for return requests). */
export interface ReturnRequestUpdatePayload {
  reason: ReturnReason;
  status?: ReturnStatus;
  refund_amount?: string | null;
  resolved_at?: string | null;
}

type ReturnRequestImmutableFields = "order" | "org" | "user" | "return_number" | "requested_at";

/** The update response omits `order`/`org`/`user`/`return_number`/`requested_at`
 * — confirmed by directly testing the live server. */
export function updateReturnRequestApi(id: number, payload: ReturnRequestUpdatePayload) {
  return apiRequest<Omit<ApiReturnRequest, ReturnRequestImmutableFields>>(`return-requests/${id}/`, {
    method: "PUT",
    body: payload,
  });
}

export function patchReturnRequestApi(id: number, payload: Partial<ReturnRequestUpdatePayload>) {
  return apiRequest<Omit<ApiReturnRequest, ReturnRequestImmutableFields>>(`return-requests/${id}/`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteReturnRequestApi(id: number) {
  return apiRequest<void>(`return-requests/${id}/`, { method: "DELETE" });
}

/* --------------------------------- Return lines -------------------------------- */
/* Ownership follows the parent return request. */

export function listReturnLinesApi(params?: { return_req?: number; order_line?: number; page_size?: number }) {
  return apiRequest<ApiPage<ApiReturnLine>>(`return-lines/${buildQueryString(params)}`);
}

export function getReturnLineApi(id: number) {
  return apiRequest<ApiReturnLine>(`return-lines/${id}/`);
}

export interface ReturnLinePayload {
  return_req: number;
  order_line: number;
  qty_returned: string;
  refund_amount: string;
}

export function createReturnLineApi(payload: ReturnLinePayload) {
  return apiRequest<ApiReturnLine>("return-lines/", { method: "POST", body: payload });
}

export function updateReturnLineApi(id: number, payload: ReturnLinePayload) {
  return apiRequest<ApiReturnLine>(`return-lines/${id}/`, { method: "PUT", body: payload });
}

export function patchReturnLineApi(id: number, payload: Partial<ReturnLinePayload>) {
  return apiRequest<ApiReturnLine>(`return-lines/${id}/`, { method: "PATCH", body: payload });
}

export function deleteReturnLineApi(id: number) {
  return apiRequest<void>(`return-lines/${id}/`, { method: "DELETE" });
}

/* --------------------------------- Disputes -------------------------------- */
/* Visible to whoever raised it, or whoever it's against; staff see all. */

export function listDisputesApi(params?: {
  order?: number;
  raised_user?: number;
  raised_org?: number;
  against_user?: number;
  against_org?: number;
  admin_user?: number;
  status?: DisputeStatus;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiDispute>>(`disputes/${buildQueryString(params)}`);
}

export function getDisputeApi(id: number) {
  return apiRequest<ApiDispute>(`disputes/${id}/`);
}

/** Exactly one of `raised_user`/`raised_org` (must be the caller/their org) and one of
 * `against_user`/`against_org` (no relationship check) required. All four, plus `order`,
 * are immutable after creation. */
export interface DisputeCreatePayload {
  order: number;
  subject: string;
  description: string;
  raised_user?: number | null;
  raised_org?: number | null;
  against_user?: number | null;
  against_org?: number | null;
  evidence_urls?: string[] | null;
}

/** `admin_user`/`resolution`/`resolved_at` are only ever set via the `resolve`
 * action below, never a raw write. */
export function createDisputeApi(payload: DisputeCreatePayload) {
  return apiRequest<ApiDispute>("disputes/", { method: "POST", body: payload });
}

export interface DisputeUpdatePayload {
  subject: string;
  description: string;
  status?: DisputeStatus;
  evidence_urls?: string[] | null;
}

export function updateDisputeApi(id: number, payload: DisputeUpdatePayload) {
  return apiRequest<ApiDispute>(`disputes/${id}/`, { method: "PUT", body: payload });
}

export function patchDisputeApi(id: number, payload: Partial<DisputeUpdatePayload>) {
  return apiRequest<ApiDispute>(`disputes/${id}/`, { method: "PATCH", body: payload });
}

export function deleteDisputeApi(id: number) {
  return apiRequest<void>(`disputes/${id}/`, { method: "DELETE" });
}

/** Staff only. Sets status to "dismissed" if `dismiss` is true, else "resolved";
 * stamps `admin_user` to the calling staff member and `resolved_at` to now. */
export function resolveDisputeApi(id: number, payload: { resolution: string; dismiss?: boolean }) {
  return apiRequest<ApiDispute>(`disputes/${id}/resolve/`, { method: "POST", body: payload });
}
