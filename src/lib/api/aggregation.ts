import { apiRequest, buildQueryString, type ApiPage } from "./client";
import type { AggGroupStatus, AggPartStatus, ApiAggGroup, ApiAggPart, ApiGrpPledge, ApiGrpPurchase, GrpPledgeStatus, GrpPurchaseStatus } from "./types";

/* --------------------------------- Aggregation groups -------------------------------- */
/* Staff-only for every action — proposing/confirming a bulk-sale group is an ops concern. */

export function listAggGroupsApi(params?: { request?: number; status?: AggGroupStatus; page_size?: number }) {
  return apiRequest<ApiPage<ApiAggGroup>>(`agg-groups/${buildQueryString(params)}`);
}

export function getAggGroupApi(id: number) {
  return apiRequest<ApiAggGroup>(`agg-groups/${id}/`);
}

export interface AggGroupPayload {
  request: number;
  target_qty: string;
  status?: AggGroupStatus;
  confirmed_qty?: string;
}

export function createAggGroupApi(payload: AggGroupPayload) {
  return apiRequest<ApiAggGroup>("agg-groups/", { method: "POST", body: payload });
}

export function updateAggGroupApi(id: number, payload: AggGroupPayload) {
  return apiRequest<ApiAggGroup>(`agg-groups/${id}/`, { method: "PUT", body: payload });
}

export function patchAggGroupApi(id: number, payload: Partial<AggGroupPayload>) {
  return apiRequest<ApiAggGroup>(`agg-groups/${id}/`, { method: "PATCH", body: payload });
}

export function deleteAggGroupApi(id: number) {
  return apiRequest<void>(`agg-groups/${id}/`, { method: "DELETE" });
}

/* ----------------------------- Aggregation participants ----------------------------- */
/* Public read; writable only by the participating listing's seller (or staff). */

export function listAggPartsApi(params?: { group?: number; listing?: number; status?: AggPartStatus; page_size?: number }) {
  return apiRequest<ApiPage<ApiAggPart>>(`agg-parts/${buildQueryString(params)}`, { auth: false });
}

export function getAggPartApi(id: number) {
  return apiRequest<ApiAggPart>(`agg-parts/${id}/`, { auth: false });
}

export interface AggPartPayload {
  group: number;
  listing: number;
  alloc_qty: string;
  agreed_price: string;
  status?: AggPartStatus;
  responded_at?: string | null;
}

export function createAggPartApi(payload: AggPartPayload) {
  return apiRequest<ApiAggPart>("agg-parts/", { method: "POST", body: payload });
}

export function updateAggPartApi(id: number, payload: AggPartPayload) {
  return apiRequest<ApiAggPart>(`agg-parts/${id}/`, { method: "PUT", body: payload });
}

export function patchAggPartApi(id: number, payload: Partial<AggPartPayload>) {
  return apiRequest<ApiAggPart>(`agg-parts/${id}/`, { method: "PATCH", body: payload });
}

export function deleteAggPartApi(id: number) {
  return apiRequest<void>(`agg-parts/${id}/`, { method: "DELETE" });
}

/* --------------------------------- Group purchases -------------------------------- */
/* Public read; writable only by a member of the supplier_org (or staff). */

export function listGrpPurchasesApi(params?: { variant?: number; supplier_org?: number; status?: GrpPurchaseStatus; page_size?: number }) {
  return apiRequest<ApiPage<ApiGrpPurchase>>(`grp-purchases/${buildQueryString(params)}`, { auth: false });
}

export function getGrpPurchaseApi(id: number) {
  return apiRequest<ApiGrpPurchase>(`grp-purchases/${id}/`, { auth: false });
}

/** `supplier_org` is required on create, immutable after (excluded from update). */
export interface GrpPurchaseCreatePayload {
  variant: number;
  supplier_org: number;
  threshold_qty: string;
  deadline: string;
  pledged_qty?: string;
  invoice_total?: string | null;
  status?: GrpPurchaseStatus;
}

/** The create response omits `created_at` — confirmed by directly testing the
 * live server (the declared OpenAPI schema is not a reliable source for this
 * backend's actual write-response shapes; several other resources' declared
 * `Create`/`Update` schemas turned out to be narrower than what's really
 * returned). */
export function createGrpPurchaseApi(payload: GrpPurchaseCreatePayload) {
  return apiRequest<Omit<ApiGrpPurchase, "created_at">>("grp-purchases/", { method: "POST", body: payload });
}

export interface GrpPurchaseUpdatePayload {
  variant: number;
  threshold_qty: string;
  deadline: string;
  pledged_qty?: string;
  invoice_total?: string | null;
  status?: GrpPurchaseStatus;
}

/** The update response omits `created_at`/`supplier_org` (the latter
 * immutable) — confirmed by directly testing the live server. */
export function updateGrpPurchaseApi(id: number, payload: GrpPurchaseUpdatePayload) {
  return apiRequest<Omit<ApiGrpPurchase, "created_at" | "supplier_org">>(`grp-purchases/${id}/`, {
    method: "PUT",
    body: payload,
  });
}

export function patchGrpPurchaseApi(id: number, payload: Partial<GrpPurchaseUpdatePayload>) {
  return apiRequest<Omit<ApiGrpPurchase, "created_at" | "supplier_org">>(`grp-purchases/${id}/`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteGrpPurchaseApi(id: number) {
  return apiRequest<void>(`grp-purchases/${id}/`, { method: "DELETE" });
}

/* --------------------------------- Group pledges -------------------------------- */
/* Private to the pledging farmer (or staff). */

export function listGrpPledgesApi(params?: { grp_purchase?: number; farmer_user?: number; status?: GrpPledgeStatus; page_size?: number }) {
  return apiRequest<ApiPage<ApiGrpPledge>>(`grp-pledges/${buildQueryString(params)}`);
}

export function getGrpPledgeApi(id: number) {
  return apiRequest<ApiGrpPledge>(`grp-pledges/${id}/`);
}

/** `farmer_user` must equal the caller's own id (staff exempt). */
export interface GrpPledgePayload {
  grp_purchase: number;
  farmer_user: number;
  pledged_qty: string;
  share_amount?: string | null;
  status?: GrpPledgeStatus;
}

export function createGrpPledgeApi(payload: GrpPledgePayload) {
  return apiRequest<ApiGrpPledge>("grp-pledges/", { method: "POST", body: payload });
}

export function updateGrpPledgeApi(id: number, payload: GrpPledgePayload) {
  return apiRequest<ApiGrpPledge>(`grp-pledges/${id}/`, { method: "PUT", body: payload });
}

export function patchGrpPledgeApi(id: number, payload: Partial<GrpPledgePayload>) {
  return apiRequest<ApiGrpPledge>(`grp-pledges/${id}/`, { method: "PATCH", body: payload });
}

export function deleteGrpPledgeApi(id: number) {
  return apiRequest<void>(`grp-pledges/${id}/`, { method: "DELETE" });
}
