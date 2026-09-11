import { apiRequest, buildQueryString, type ApiPage } from "./client";
import type {
  ApiEscrow,
  ApiPayMethod,
  ApiPayment,
  ApiPayout,
  ApiPayTxn,
  EscrowStatus,
  PaymentStatus,
  PayoutStatus,
  PayTxnType,
} from "./types";

/* --------------------------------- Payment methods -------------------------------- */
/* Public read; writes need staff. */

export function listPayMethodsApi(params?: { is_active?: boolean; search?: string }) {
  return apiRequest<ApiPage<ApiPayMethod>>(`pay-methods/${buildQueryString(params)}`, { auth: false });
}

export function getPayMethodApi(id: number) {
  return apiRequest<ApiPayMethod>(`pay-methods/${id}/`, { auth: false });
}

export interface PayMethodPayload {
  name: string;
  code: string;
  provider?: string;
  api_endpoint?: string;
  is_active?: boolean;
}

export function createPayMethodApi(payload: PayMethodPayload) {
  return apiRequest<ApiPayMethod>("pay-methods/", { method: "POST", body: payload });
}

export function updatePayMethodApi(id: number, payload: PayMethodPayload) {
  return apiRequest<ApiPayMethod>(`pay-methods/${id}/`, { method: "PUT", body: payload });
}

export function patchPayMethodApi(id: number, payload: Partial<PayMethodPayload>) {
  return apiRequest<ApiPayMethod>(`pay-methods/${id}/`, { method: "PATCH", body: payload });
}

export function deletePayMethodApi(id: number) {
  return apiRequest<void>(`pay-methods/${id}/`, { method: "DELETE" });
}

/* --------------------------------- Payments -------------------------------- */
/* Private to the order's buyer/seller; staff see all. */

export function listPaymentsApi(params?: { order?: number; method?: number; status?: PaymentStatus; page_size?: number }) {
  return apiRequest<ApiPage<ApiPayment>>(`payments/${buildQueryString(params)}`);
}

export function getPaymentApi(id: number) {
  return apiRequest<ApiPayment>(`payments/${id}/`);
}

/** `order`/`method`/`currency`/`amount` are immutable after creation. */
export interface PaymentCreatePayload {
  order: number;
  method: number;
  amount: string;
  currency: number;
  provider_ref?: string;
}

/** The create response omits `status`/`initiated_at`/`captured_at`/`failed_at`/
 * `refunded_at`, even though `status` defaults to `"pending"` server-side —
 * confirmed by directly testing the live server (re-`GET` if you need them). */
export function createPaymentApi(payload: PaymentCreatePayload) {
  return apiRequest<Omit<ApiPayment, "status" | "initiated_at" | "captured_at" | "failed_at" | "refunded_at">>(
    "payments/",
    { method: "POST", body: payload },
  );
}

export interface PaymentUpdatePayload {
  status?: PaymentStatus;
  provider_ref?: string;
  captured_at?: string | null;
  failed_at?: string | null;
  refunded_at?: string | null;
}

/** The update response omits `amount`/`currency`/`initiated_at`/`method`/`order`
 * — confirmed by directly testing the live server. */
export function updatePaymentApi(id: number, payload: PaymentUpdatePayload) {
  return apiRequest<Omit<ApiPayment, "amount" | "currency" | "initiated_at" | "method" | "order">>(
    `payments/${id}/`,
    { method: "PUT", body: payload },
  );
}

export function patchPaymentApi(id: number, payload: Partial<PaymentUpdatePayload>) {
  return apiRequest<Omit<ApiPayment, "amount" | "currency" | "initiated_at" | "method" | "order">>(
    `payments/${id}/`,
    { method: "PATCH", body: payload },
  );
}

export function deletePaymentApi(id: number) {
  return apiRequest<void>(`payments/${id}/`, { method: "DELETE" });
}

/* ------------------------------- Payment transactions ------------------------------ */
/* Ownership follows the payment's order, two relations away. */

export function listPayTxnsApi(params?: { payment?: number; txn_type?: PayTxnType; page_size?: number }) {
  return apiRequest<ApiPage<ApiPayTxn>>(`pay-txns/${buildQueryString(params)}`);
}

export function getPayTxnApi(id: number) {
  return apiRequest<ApiPayTxn>(`pay-txns/${id}/`);
}

export interface PayTxnPayload {
  payment: number;
  txn_type: PayTxnType;
  provider_txn_id: string;
  raw_response?: Record<string, unknown>;
}

export function createPayTxnApi(payload: PayTxnPayload) {
  return apiRequest<ApiPayTxn>("pay-txns/", { method: "POST", body: payload });
}

export function updatePayTxnApi(id: number, payload: PayTxnPayload) {
  return apiRequest<ApiPayTxn>(`pay-txns/${id}/`, { method: "PUT", body: payload });
}

export function patchPayTxnApi(id: number, payload: Partial<PayTxnPayload>) {
  return apiRequest<ApiPayTxn>(`pay-txns/${id}/`, { method: "PATCH", body: payload });
}

export function deletePayTxnApi(id: number) {
  return apiRequest<void>(`pay-txns/${id}/`, { method: "DELETE" });
}

/* --------------------------------- Escrow accounts -------------------------------- */
/* Private to the order's buyer/seller; staff see all. */

export function listEscrowsApi(params?: { order?: number; status?: EscrowStatus; page_size?: number }) {
  return apiRequest<ApiPage<ApiEscrow>>(`escrows/${buildQueryString(params)}`);
}

export function getEscrowApi(id: number) {
  return apiRequest<ApiEscrow>(`escrows/${id}/`);
}

/** `order` is required, immutable after (one escrow per order). */
export interface EscrowCreatePayload {
  order: number;
  currency: number;
  held_amount?: string;
  held_at?: string | null;
}

type EscrowReleaseFields = "released_amount" | "refunded_amount" | "status" | "released_at" | "refunded_at";

/** The create response omits the release-only fields — confirmed by directly
 * testing the live server; they only change via the `release` action below. */
export function createEscrowApi(payload: EscrowCreatePayload) {
  return apiRequest<Omit<ApiEscrow, EscrowReleaseFields>>("escrows/", { method: "POST", body: payload });
}

/** `released_amount`/`refunded_amount`/`status`/`released_at`/`refunded_at` are read-only
 * here — they only change via the `release` action below. */
export interface EscrowUpdatePayload {
  held_amount?: string;
  held_at?: string | null;
}

/** The update response also omits `currency`/`order` — confirmed by directly
 * testing the live server. */
export function updateEscrowApi(id: number, payload: EscrowUpdatePayload) {
  return apiRequest<Omit<ApiEscrow, EscrowReleaseFields | "currency" | "order">>(`escrows/${id}/`, {
    method: "PUT",
    body: payload,
  });
}

export function patchEscrowApi(id: number, payload: Partial<EscrowUpdatePayload>) {
  return apiRequest<Omit<ApiEscrow, EscrowReleaseFields | "currency" | "order">>(`escrows/${id}/`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteEscrowApi(id: number) {
  return apiRequest<void>(`escrows/${id}/`, { method: "DELETE" });
}

/** Manual/support override — same release routine that runs automatically once a
 * delivery's two-sided confirmation completes. Staff only. Idempotent no-op unless
 * `status` is currently `"holding"`. */
export function releaseEscrowApi(id: number) {
  return apiRequest<ApiEscrow>(`escrows/${id}/release/`, { method: "POST" });
}

/* --------------------------------- Payouts -------------------------------- */
/* Private to the recipient (user or org member); staff see all. Created by staff/ops only. */

export function listPayoutsApi(params?: {
  order?: number;
  recipient_user?: number;
  recipient_org?: number;
  status?: PayoutStatus;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiPayout>>(`payouts/${buildQueryString(params)}`);
}

export function getPayoutApi(id: number) {
  return apiRequest<ApiPayout>(`payouts/${id}/`);
}

/** Exactly one of `recipient_user`/`recipient_org` required. Staff only. */
export interface PayoutCreatePayload {
  order: number;
  amount: string;
  currency: number;
  recipient_user?: number | null;
  recipient_org?: number | null;
  batch_reference?: string;
}

export function createPayoutApi(payload: PayoutCreatePayload) {
  return apiRequest<ApiPayout>("payouts/", { method: "POST", body: payload });
}

/** `order` and recipient identity are immutable after creation. Staff only. */
export interface PayoutUpdatePayload {
  status?: PayoutStatus;
  batch_reference?: string;
  completed_at?: string | null;
}

export function updatePayoutApi(id: number, payload: PayoutUpdatePayload) {
  return apiRequest<ApiPayout>(`payouts/${id}/`, { method: "PUT", body: payload });
}

export function patchPayoutApi(id: number, payload: Partial<PayoutUpdatePayload>) {
  return apiRequest<ApiPayout>(`payouts/${id}/`, { method: "PATCH", body: payload });
}

export function deletePayoutApi(id: number) {
  return apiRequest<void>(`payouts/${id}/`, { method: "DELETE" });
}
