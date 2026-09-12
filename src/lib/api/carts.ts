import { apiRequest, buildQueryString, type ApiPage } from "./client";
import type { ApiCart, ApiCartItem } from "./types";

/* --------------------------------- Carts -------------------------------- */
/* Private per-owner (user or org member); staff see all. */

export function listCartsApi(params?: { buyer_user?: number; buyer_org?: number; currency?: number; page_size?: number }) {
  return apiRequest<ApiPage<ApiCart>>(`carts/${buildQueryString(params)}`);
}

export function getCartApi(id: number) {
  return apiRequest<ApiCart>(`carts/${id}/`);
}

/** Exactly one of `buyer_user`/`buyer_org` required; both immutable after creation. */
export interface CartCreatePayload {
  buyer_user?: number | null;
  buyer_org?: number | null;
  currency: number;
}

export function createCartApi(payload: CartCreatePayload) {
  return apiRequest<ApiCart>("carts/", { method: "POST", body: payload });
}

export function updateCartApi(id: number, payload: { currency: number }) {
  return apiRequest<ApiCart>(`carts/${id}/`, { method: "PUT", body: payload });
}

export function patchCartApi(id: number, payload: { currency?: number }) {
  return apiRequest<ApiCart>(`carts/${id}/`, { method: "PATCH", body: payload });
}

export function deleteCartApi(id: number) {
  return apiRequest<void>(`carts/${id}/`, { method: "DELETE" });
}

/* --------------------------------- Cart items -------------------------------- */
/* Ownership follows the parent cart, not a field on the item itself. */

export function listCartItemsApi(params?: { cart?: number; variant?: number; listing?: number; page_size?: number }) {
  return apiRequest<ApiPage<ApiCartItem>>(`cart-items/${buildQueryString(params)}`);
}

export function getCartItemApi(id: number) {
  return apiRequest<ApiCartItem>(`cart-items/${id}/`);
}

export interface CartItemWritePayload {
  cart: number;
  variant: number;
  listing?: number | null;
  quantity: string;
  unit_price: string;
}

export function createCartItemApi(payload: CartItemWritePayload) {
  return apiRequest<ApiCartItem>("cart-items/", { method: "POST", body: payload });
}

export function updateCartItemApi(id: number, payload: CartItemWritePayload) {
  return apiRequest<ApiCartItem>(`cart-items/${id}/`, { method: "PUT", body: payload });
}

export function patchCartItemApi(id: number, payload: Partial<CartItemWritePayload>) {
  return apiRequest<ApiCartItem>(`cart-items/${id}/`, { method: "PATCH", body: payload });
}

export function deleteCartItemApi(id: number) {
  return apiRequest<void>(`cart-items/${id}/`, { method: "DELETE" });
}
