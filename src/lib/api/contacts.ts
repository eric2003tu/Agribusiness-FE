import { apiRequest, buildQueryString, type ApiPage } from "./client";
import type { AddressType, ApiAddress, ApiContact, ContactType } from "./types";

/* --------------------------------- Addresses -------------------------------- */
/* Staff-only for every action, including reads — no public visibility. */

export function listAddressesApi(params?: {
  user?: number;
  organization?: number;
  addr_type?: AddressType;
  location?: number;
  is_default?: boolean;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiAddress>>(`addresses/${buildQueryString(params)}`);
}

export function getAddressApi(id: number) {
  return apiRequest<ApiAddress>(`addresses/${id}/`);
}

/** Exactly one of `user`/`organization` must be set (DB- and serializer-enforced). */
export interface AddressCreatePayload {
  user?: number | null;
  organization?: number | null;
  addr_type: AddressType;
  location: number;
  street?: string;
  landmark?: string;
  is_default?: boolean;
}

export function createAddressApi(payload: AddressCreatePayload) {
  return apiRequest<ApiAddress>("addresses/", { method: "POST", body: payload });
}

/** `user`/`organization` are immutable once created — excluded from update payloads. */
export interface AddressUpdatePayload {
  addr_type: AddressType;
  location: number;
  street?: string;
  landmark?: string;
  is_default?: boolean;
}

export function updateAddressApi(id: number, payload: AddressUpdatePayload) {
  return apiRequest<ApiAddress>(`addresses/${id}/`, { method: "PUT", body: payload });
}

export function patchAddressApi(id: number, payload: Partial<AddressUpdatePayload>) {
  return apiRequest<ApiAddress>(`addresses/${id}/`, { method: "PATCH", body: payload });
}

export function deleteAddressApi(id: number) {
  return apiRequest<void>(`addresses/${id}/`, { method: "DELETE" });
}

/* --------------------------------- Contacts -------------------------------- */
/* Staff-only for every action, including reads — no public visibility. */

export function listContactsApi(params?: {
  user?: number;
  organization?: number;
  contact_type?: ContactType;
  is_primary?: boolean;
  is_verified?: boolean;
  value?: string;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiContact>>(`contacts/${buildQueryString(params)}`);
}

export function getContactApi(id: number) {
  return apiRequest<ApiContact>(`contacts/${id}/`);
}

/** Exactly one of `user`/`organization` must be set. `is_verified` cannot be
 * set on create — always `false` for a newly created contact. */
export interface ContactCreatePayload {
  user?: number | null;
  organization?: number | null;
  contact_type: ContactType;
  value: string;
  is_primary?: boolean;
}

export function createContactApi(payload: ContactCreatePayload) {
  return apiRequest<ApiContact>("contacts/", { method: "POST", body: payload });
}

/** `user`/`organization` stay immutable; unlike create, `is_verified` IS writable here. */
export interface ContactUpdatePayload {
  contact_type: ContactType;
  value: string;
  is_primary?: boolean;
  is_verified?: boolean;
}

export function updateContactApi(id: number, payload: ContactUpdatePayload) {
  return apiRequest<ApiContact>(`contacts/${id}/`, { method: "PUT", body: payload });
}

export function patchContactApi(id: number, payload: Partial<ContactUpdatePayload>) {
  return apiRequest<ApiContact>(`contacts/${id}/`, { method: "PATCH", body: payload });
}

export function deleteContactApi(id: number) {
  return apiRequest<void>(`contacts/${id}/`, { method: "DELETE" });
}
