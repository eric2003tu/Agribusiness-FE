import { apiRequest, buildQueryString, type ApiPage } from "./client";
import type { ApiUser, UserStatus as ApiUserStatus } from "./types";

/**
 * Admin/staff account-management CRUD for user records — distinct from the
 * public registration/login/OTP flows in `./auth.ts`. Writes take flat FK ids
 * (`preferred_language`/`primary_location`/`organization`), but the response
 * — confirmed by directly testing the live server — is always the full
 * nested `ApiUser` read shape (`preferred_language: {id, code, name}`, etc.),
 * same as `GET`.
 */
export function listUsersApi(params?: {
  status?: ApiUserStatus;
  is_verified?: boolean;
  preferred_language?: number;
  primary_location?: number;
  organization?: number;
  full_name?: string;
  search?: string;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiUser>>(`users/${buildQueryString(params)}`);
}

export function getUserApi(id: number) {
  return apiRequest<ApiUser>(`users/${id}/`);
}

/** `PUT`/`PATCH` share this shape; there's no `password` field on this
 * endpoint at all — changing a password is a separate flow not exposed here. */
export interface UserWritePayload {
  phone: string;
  full_name: string;
  preferred_language: number;
  email?: string;
  national_id?: string;
  primary_location?: number | null;
  organization?: number | null;
  is_verified?: boolean;
  reliability_score?: string;
  notification_preferences?: Record<string, unknown>;
  status?: ApiUserStatus;
}

export interface UserCreatePayload extends UserWritePayload {
  password: string;
}

export function createUserApi(payload: UserCreatePayload) {
  return apiRequest<ApiUser>("users/", { method: "POST", body: payload });
}

export function updateUserApi(id: number, payload: UserWritePayload) {
  return apiRequest<ApiUser>(`users/${id}/`, { method: "PUT", body: payload });
}

export function patchUserApi(id: number, payload: Partial<UserWritePayload>) {
  return apiRequest<ApiUser>(`users/${id}/`, { method: "PATCH", body: payload });
}

export function deleteUserApi(id: number) {
  return apiRequest<void>(`users/${id}/`, { method: "DELETE" });
}
