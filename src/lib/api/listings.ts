import { apiRequest, buildQueryString, type ApiPage } from "./client";
import type {
  ApiListing,
  ApiListingPhoto,
  ApiSourcingRequest,
  ListingScope,
  ListingStatus,
  SourcingRequestStatus,
} from "./types";

/* --------------------------------- Listings -------------------------------- */
/* Public read; writable only by the owner (seller_user self, or seller_org member) or staff. */

export function listListingsApi(params?: {
  seller_user?: number;
  seller_org?: number;
  variant?: number;
  location?: number;
  grade?: string;
  scope?: ListingScope;
  status?: ListingStatus;
  min_price?: number | string;
  max_price?: number | string;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiListing>>(`listings/${buildQueryString(params)}`, { auth: false });
}

export function getListingApi(id: number) {
  return apiRequest<ApiListing>(`listings/${id}/`, { auth: false });
}

/** Exactly one of `seller_user`/`seller_org` required; both immutable after creation. */
export interface ListingCreatePayload {
  seller_user?: number | null;
  seller_org?: number | null;
  variant: number;
  qty_available: string;
  uom: number;
  location: number;
  harvest_date: string;
  unit_price?: string | null;
  negotiable?: boolean;
  grade?: string;
  scope?: ListingScope;
  status?: ListingStatus;
  expires_at?: string | null;
}

export function createListingApi(payload: ListingCreatePayload) {
  return apiRequest<ApiListing>("listings/", { method: "POST", body: payload });
}

export interface ListingUpdatePayload {
  variant: number;
  qty_available: string;
  uom: number;
  location: number;
  harvest_date: string;
  unit_price?: string | null;
  negotiable?: boolean;
  grade?: string;
  scope?: ListingScope;
  status?: ListingStatus;
  expires_at?: string | null;
}

export function updateListingApi(id: number, payload: ListingUpdatePayload) {
  return apiRequest<ApiListing>(`listings/${id}/`, { method: "PUT", body: payload });
}

export function patchListingApi(id: number, payload: Partial<ListingUpdatePayload>) {
  return apiRequest<ApiListing>(`listings/${id}/`, { method: "PATCH", body: payload });
}

export function deleteListingApi(id: number) {
  return apiRequest<void>(`listings/${id}/`, { method: "DELETE" });
}

/* ------------------------------- Listing photos ------------------------------ */
/* Real multipart file uploads, not URL strings. Ownership follows the parent listing's seller. */

export function listListingPhotosApi(params?: { listing?: number; page_size?: number }) {
  return apiRequest<ApiPage<ApiListingPhoto>>(`listing-photos/${buildQueryString(params)}`, { auth: false });
}

export function getListingPhotoApi(id: number) {
  return apiRequest<ApiListingPhoto>(`listing-photos/${id}/`, { auth: false });
}

export interface ListingPhotoUpload {
  listing: number;
  photo: File;
}

function listingPhotoFormData(payload: Partial<ListingPhotoUpload>): FormData {
  const form = new FormData();
  if (payload.listing !== undefined) form.append("listing", String(payload.listing));
  if (payload.photo !== undefined) form.append("photo", payload.photo);
  return form;
}

/** The write response omits `created_at` — confirmed by directly testing the
 * live server (create, update and patch all share the same write serializer).
 * It also returns `photo` as an absolute URL, unlike list/retrieve's relative
 * path — `resolveMediaUrl` from `./client` normalizes either for rendering. */
export function createListingPhotoApi(payload: ListingPhotoUpload) {
  return apiRequest<Omit<ApiListingPhoto, "created_at">>("listing-photos/", {
    method: "POST",
    body: listingPhotoFormData(payload),
  });
}

export function updateListingPhotoApi(id: number, payload: ListingPhotoUpload) {
  return apiRequest<Omit<ApiListingPhoto, "created_at">>(`listing-photos/${id}/`, {
    method: "PUT",
    body: listingPhotoFormData(payload),
  });
}

export function patchListingPhotoApi(id: number, payload: Partial<ListingPhotoUpload>) {
  return apiRequest<Omit<ApiListingPhoto, "created_at">>(`listing-photos/${id}/`, {
    method: "PATCH",
    body: listingPhotoFormData(payload),
  });
}

export function deleteListingPhotoApi(id: number) {
  return apiRequest<void>(`listing-photos/${id}/`, { method: "DELETE" });
}

/* ------------------------------- Sourcing requests ---------------------------- */
/* Public read; writable only by the owner (buyer_user self, or buyer_org member) or staff. */

export function listSourcingRequestsApi(params?: {
  buyer_user?: number;
  buyer_org?: number;
  product?: number;
  delivery_loc?: number;
  status?: SourcingRequestStatus;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiSourcingRequest>>(`requests/${buildQueryString(params)}`, { auth: false });
}

export function getSourcingRequestApi(id: number) {
  return apiRequest<ApiSourcingRequest>(`requests/${id}/`, { auth: false });
}

/** Exactly one of `buyer_user`/`buyer_org` required; both immutable after creation. */
export interface SourcingRequestCreatePayload {
  buyer_user?: number | null;
  buyer_org?: number | null;
  product: number;
  qty_needed: string;
  uom: number;
  delivery_loc: number;
  needed_by: string;
  target_price?: string | null;
  status?: SourcingRequestStatus;
}

export function createSourcingRequestApi(payload: SourcingRequestCreatePayload) {
  return apiRequest<ApiSourcingRequest>("requests/", { method: "POST", body: payload });
}

export interface SourcingRequestUpdatePayload {
  product: number;
  qty_needed: string;
  uom: number;
  delivery_loc: number;
  needed_by: string;
  target_price?: string | null;
  status?: SourcingRequestStatus;
}

export function updateSourcingRequestApi(id: number, payload: SourcingRequestUpdatePayload) {
  return apiRequest<ApiSourcingRequest>(`requests/${id}/`, { method: "PUT", body: payload });
}

export function patchSourcingRequestApi(id: number, payload: Partial<SourcingRequestUpdatePayload>) {
  return apiRequest<ApiSourcingRequest>(`requests/${id}/`, { method: "PATCH", body: payload });
}

export function deleteSourcingRequestApi(id: number) {
  return apiRequest<void>(`requests/${id}/`, { method: "DELETE" });
}
