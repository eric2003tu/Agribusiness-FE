import { apiRequest, buildQueryString, type ApiPage } from "./client";
import type { ApiNotification, NotifChannel, NotifType } from "./types";

/* --------------------------------- Notifications -------------------------------- */
/* Scoped to the caller's own notifications (staff see all). Only staff can create/update/
 * delete — a recipient's only self-service write is the `mark-read` action. */

export function listNotificationsApi(params?: {
  user?: number;
  notif_type?: NotifType;
  channel?: NotifChannel;
  is_read?: boolean;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiNotification>>(`notifications/${buildQueryString(params)}`);
}

export function getNotificationApi(id: number) {
  return apiRequest<ApiNotification>(`notifications/${id}/`);
}

/** Staff only. */
export interface NotificationPayload {
  user: number;
  notif_type: NotifType;
  title: string;
  body?: string;
  data?: Record<string, unknown> | null;
  channel?: NotifChannel;
}

export function createNotificationApi(payload: NotificationPayload) {
  return apiRequest<ApiNotification>("notifications/", { method: "POST", body: payload });
}

export function updateNotificationApi(id: number, payload: NotificationPayload) {
  return apiRequest<ApiNotification>(`notifications/${id}/`, { method: "PUT", body: payload });
}

export function patchNotificationApi(id: number, payload: Partial<NotificationPayload>) {
  return apiRequest<ApiNotification>(`notifications/${id}/`, { method: "PATCH", body: payload });
}

export function deleteNotificationApi(id: number) {
  return apiRequest<void>(`notifications/${id}/`, { method: "DELETE" });
}

/** Caller must be the notification's own recipient, or staff. Idempotent — a no-op if
 * already read (`read_at` is not overwritten). */
export function markNotificationReadApi(id: number) {
  return apiRequest<ApiNotification>(`notifications/${id}/mark-read/`, { method: "POST" });
}
