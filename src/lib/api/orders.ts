import { apiRequest, buildQueryString, type ApiPage } from "./client";
import type { ApiDelivery, ApiOrder, ApiOrderLine, OrderChannel, OrderStatus } from "./types";

/* --------------------------------- Orders -------------------------------- */
/* Private to the two parties (buyer/seller); staff see all. */

export function listOrdersApi(params?: {
  buyer_user?: number;
  buyer_org?: number;
  seller_user?: number;
  seller_org?: number;
  channel?: OrderChannel;
  status?: OrderStatus;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiOrder>>(`orders/${buildQueryString(params)}`);
}

export function getOrderApi(id: number) {
  return apiRequest<ApiOrder>(`orders/${id}/`);
}

/** Exactly one of `buyer_user`/`buyer_org` and one of `seller_user`/`seller_org` required;
 * at most one of `agg_group`/`grp_purchase`. All four owner fields are immutable after creation. */
export interface OrderCreatePayload {
  order_number: string;
  channel: OrderChannel;
  currency: number;
  subtotal: string;
  grand_total: string;
  buyer_user?: number | null;
  buyer_org?: number | null;
  seller_user?: number | null;
  seller_org?: number | null;
  status?: OrderStatus;
  agg_group?: number | null;
  grp_purchase?: number | null;
  discount_total?: string;
  tax_total?: string;
  billing_addr?: number | null;
  pickup_addr?: number | null;
  delivery_addr?: number | null;
  placed_at?: string | null;
  confirmed_at?: string | null;
  delivered_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
}

export function createOrderApi(payload: OrderCreatePayload) {
  return apiRequest<ApiOrder>("orders/", { method: "POST", body: payload });
}

export interface OrderUpdatePayload {
  channel: OrderChannel;
  currency: number;
  subtotal: string;
  grand_total: string;
  status?: OrderStatus;
  agg_group?: number | null;
  grp_purchase?: number | null;
  discount_total?: string;
  tax_total?: string;
  billing_addr?: number | null;
  pickup_addr?: number | null;
  delivery_addr?: number | null;
  placed_at?: string | null;
  confirmed_at?: string | null;
  delivered_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
}

export function updateOrderApi(id: number, payload: OrderUpdatePayload) {
  return apiRequest<ApiOrder>(`orders/${id}/`, { method: "PUT", body: payload });
}

export function patchOrderApi(id: number, payload: Partial<OrderUpdatePayload>) {
  return apiRequest<ApiOrder>(`orders/${id}/`, { method: "PATCH", body: payload });
}

export function deleteOrderApi(id: number) {
  return apiRequest<void>(`orders/${id}/`, { method: "DELETE" });
}

/* --------------------------------- Order lines -------------------------------- */
/* Ownership follows the parent order. */

export function listOrderLinesApi(params?: { order?: number; variant?: number; listing?: number; page_size?: number }) {
  return apiRequest<ApiPage<ApiOrderLine>>(`order-lines/${buildQueryString(params)}`);
}

export function getOrderLineApi(id: number) {
  return apiRequest<ApiOrderLine>(`order-lines/${id}/`);
}

export interface OrderLinePayload {
  order: number;
  variant: number;
  quantity: string;
  uom: number;
  unit_price: string;
  line_sub: string;
  line_total: string;
  listing?: number | null;
}

export function createOrderLineApi(payload: OrderLinePayload) {
  return apiRequest<ApiOrderLine>("order-lines/", { method: "POST", body: payload });
}

export function updateOrderLineApi(id: number, payload: OrderLinePayload) {
  return apiRequest<ApiOrderLine>(`order-lines/${id}/`, { method: "PUT", body: payload });
}

export function patchOrderLineApi(id: number, payload: Partial<OrderLinePayload>) {
  return apiRequest<ApiOrderLine>(`order-lines/${id}/`, { method: "PATCH", body: payload });
}

export function deleteOrderLineApi(id: number) {
  return apiRequest<void>(`order-lines/${id}/`, { method: "DELETE" });
}

/* --------------------------------- Deliveries -------------------------------- */
/* Ownership follows the parent order. `seller_confirmed`/`buyer_confirmed`/`completed_at`
 * are only ever set via the confirm-seller/confirm-buyer actions below, never a raw PATCH. */

export function listDeliveriesApi(params?: { order?: number; page_size?: number }) {
  return apiRequest<ApiPage<ApiDelivery>>(`deliveries/${buildQueryString(params)}`);
}

export function getDeliveryApi(id: number) {
  return apiRequest<ApiDelivery>(`deliveries/${id}/`);
}

/** `order` is required on create, immutable after (one delivery per order). */
export interface DeliveryCreatePayload {
  order: number;
  pickup_addr?: number | null;
  delivery_addr?: number | null;
  notes?: string;
}

type DeliveryConfirmationFields = "seller_confirmed" | "buyer_confirmed" | "completed_at" | "created_at";

/** The create response omits the confirmation fields (only ever settable via
 * `confirm-seller`/`confirm-buyer`, never a raw write) and `created_at` —
 * confirmed by directly testing the live server. */
export function createDeliveryApi(payload: DeliveryCreatePayload) {
  return apiRequest<Omit<ApiDelivery, DeliveryConfirmationFields>>("deliveries/", { method: "POST", body: payload });
}

export interface DeliveryUpdatePayload {
  pickup_addr?: number | null;
  delivery_addr?: number | null;
  notes?: string;
}

/** The update response also omits `order` — confirmed by directly testing the live server. */
export function updateDeliveryApi(id: number, payload: DeliveryUpdatePayload) {
  return apiRequest<Omit<ApiDelivery, DeliveryConfirmationFields | "order">>(`deliveries/${id}/`, {
    method: "PUT",
    body: payload,
  });
}

export function patchDeliveryApi(id: number, payload: Partial<DeliveryUpdatePayload>) {
  return apiRequest<Omit<ApiDelivery, DeliveryConfirmationFields | "order">>(`deliveries/${id}/`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteDeliveryApi(id: number) {
  return apiRequest<void>(`deliveries/${id}/`, { method: "DELETE" });
}

/** Seller marks dispatched. Idempotent. Only sets `completed_at` (+ releases escrow) if
 * `buyer_confirmed` was already set — i.e. this is the second of the two confirmations. */
export function confirmDeliverySellerApi(id: number) {
  return apiRequest<ApiDelivery>(`deliveries/${id}/confirm-seller/`, { method: "POST" });
}

/** Buyer marks received. Idempotent. Mirrors confirm-seller. */
export function confirmDeliveryBuyerApi(id: number) {
  return apiRequest<ApiDelivery>(`deliveries/${id}/confirm-buyer/`, { method: "POST" });
}
