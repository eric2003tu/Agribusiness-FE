import { apiRequest, buildQueryString, type ApiPage } from "./client";
import type { ApiReview } from "./types";

/* --------------------------------- Reviews -------------------------------- */
/* Public read (reputation browsing); writes need the reviewer (self, or org member) or staff. */

export function listReviewsApi(params?: {
  order?: number;
  reviewer_user?: number;
  reviewer_org?: number;
  reviewee_user?: number;
  reviewee_org?: number;
  rating?: number;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiReview>>(`reviews/${buildQueryString(params)}`, { auth: false });
}

export function getReviewApi(id: number) {
  return apiRequest<ApiReview>(`reviews/${id}/`, { auth: false });
}

/** Exactly one of `reviewer_user`/`reviewer_org` (must be the caller/their org) and one of
 * `reviewee_user`/`reviewee_org` (must be the *other* party on `order`) required. Rejected
 * with 400 until the order's delivery is fully confirmed, and at most one review per
 * (order, reviewer). All owner fields are immutable after creation. */
export interface ReviewCreatePayload {
  order: number;
  rating: number;
  reviewer_user?: number | null;
  reviewer_org?: number | null;
  reviewee_user?: number | null;
  reviewee_org?: number | null;
  comment?: string;
}

export function createReviewApi(payload: ReviewCreatePayload) {
  return apiRequest<ApiReview>("reviews/", { method: "POST", body: payload });
}

export interface ReviewUpdatePayload {
  rating: number;
  comment?: string;
}

export function updateReviewApi(id: number, payload: ReviewUpdatePayload) {
  return apiRequest<ApiReview>(`reviews/${id}/`, { method: "PUT", body: payload });
}

export function patchReviewApi(id: number, payload: Partial<ReviewUpdatePayload>) {
  return apiRequest<ApiReview>(`reviews/${id}/`, { method: "PATCH", body: payload });
}

export function deleteReviewApi(id: number) {
  return apiRequest<void>(`reviews/${id}/`, { method: "DELETE" });
}
