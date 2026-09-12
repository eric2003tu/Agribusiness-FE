import { apiRequest, buildQueryString, type ApiPage } from "./client";
import type { ApiMessage, ApiThread, ApiThreadUser } from "./types";

/* --------------------------------- Threads -------------------------------- */
/* Visible only to participants (or staff). Creating a thread auto-seats the caller as
 * its first participant — there is no `participants` field on this endpoint. */

export function listThreadsApi(params?: { page_size?: number }) {
  return apiRequest<ApiPage<ApiThread>>(`threads/${buildQueryString(params)}`);
}

export function getThreadApi(id: number) {
  return apiRequest<ApiThread>(`threads/${id}/`);
}

export function createThreadApi(payload: { subject?: string }) {
  return apiRequest<ApiThread>("threads/", { method: "POST", body: payload });
}

export function updateThreadApi(id: number, payload: { subject: string }) {
  return apiRequest<ApiThread>(`threads/${id}/`, { method: "PUT", body: payload });
}

export function patchThreadApi(id: number, payload: { subject?: string }) {
  return apiRequest<ApiThread>(`threads/${id}/`, { method: "PATCH", body: payload });
}

export function deleteThreadApi(id: number) {
  return apiRequest<void>(`threads/${id}/`, { method: "DELETE" });
}

/* --------------------------------- Thread participants -------------------------------- */
/* Add further participants here after creating a thread. Caller must already be a
 * participant of the target thread to add someone else (or be staff). */

export function listThreadUsersApi(params?: { thread?: number; user?: number; page_size?: number }) {
  return apiRequest<ApiPage<ApiThreadUser>>(`thread-users/${buildQueryString(params)}`);
}

export function getThreadUserApi(id: number) {
  return apiRequest<ApiThreadUser>(`thread-users/${id}/`);
}

/** The create response omits `joined_at`/`last_read_at`, even though `joined_at`
 * is stamped server-side — confirmed by directly testing the live server. */
export function createThreadUserApi(payload: { thread: number; user: number }) {
  return apiRequest<Omit<ApiThreadUser, "joined_at" | "last_read_at">>("thread-users/", {
    method: "POST",
    body: payload,
  });
}

export function deleteThreadUserApi(id: number) {
  return apiRequest<void>(`thread-users/${id}/`, { method: "DELETE" });
}

/** Sets `last_read_at` to now for this membership. Caller must be the membership's own
 * `user`, or staff. Idempotent-ish: safe to call repeatedly. */
export function markThreadReadApi(id: number) {
  return apiRequest<ApiThreadUser>(`thread-users/${id}/mark-read/`, { method: "POST" });
}

/* --------------------------------- Messages -------------------------------- */
/* Ownership follows the parent thread; only the sender may edit/delete their own message. */

export function listMessagesApi(params?: { thread?: number; sender?: number; page_size?: number }) {
  return apiRequest<ApiPage<ApiMessage>>(`messages/${buildQueryString(params)}`);
}

export function getMessageApi(id: number) {
  return apiRequest<ApiMessage>(`messages/${id}/`);
}

/** `sender` must equal the caller's own id (staff exempt) — it is not auto-derived
 * from the JWT, so it must be passed explicitly. The create response omits
 * `sent_at`, even though it's stamped server-side — confirmed by directly
 * testing the live server. */
export function createMessageApi(payload: { thread: number; sender: number; body: string }) {
  return apiRequest<Omit<ApiMessage, "sent_at">>("messages/", { method: "POST", body: payload });
}

/** `thread`/`sender` are immutable — only `body` is editable, and only by the original
 * sender. The update response only echoes back `{id, body}` — confirmed by directly
 * testing the live server. */
export function updateMessageApi(id: number, payload: { body: string }) {
  return apiRequest<Pick<ApiMessage, "id" | "body">>(`messages/${id}/`, { method: "PUT", body: payload });
}

export function patchMessageApi(id: number, payload: { body?: string }) {
  return apiRequest<Pick<ApiMessage, "id" | "body">>(`messages/${id}/`, { method: "PATCH", body: payload });
}

export function deleteMessageApi(id: number) {
  return apiRequest<void>(`messages/${id}/`, { method: "DELETE" });
}
