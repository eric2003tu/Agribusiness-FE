import { apiRequest, buildQueryString, type ApiPage } from "./client";
import type { ApiOrganizationFull, ApiOrganizationMember, ApiOrganizationType, OrganizationStatus } from "./types";

/* ----------------------------- Organization types ----------------------------- */

export function listOrganizationTypesApi(params?: { name?: string; search?: string; page_size?: number }) {
  return apiRequest<ApiPage<ApiOrganizationType>>(`organization-types/${buildQueryString(params)}`, {
    auth: false,
  });
}

export function getOrganizationTypeApi(id: number) {
  return apiRequest<ApiOrganizationType>(`organization-types/${id}/`, { auth: false });
}

export interface OrganizationTypePayload {
  name: string;
  description?: string;
}

export function createOrganizationTypeApi(payload: OrganizationTypePayload) {
  return apiRequest<ApiOrganizationType>("organization-types/", { method: "POST", body: payload });
}

export function updateOrganizationTypeApi(id: number, payload: OrganizationTypePayload) {
  return apiRequest<ApiOrganizationType>(`organization-types/${id}/`, { method: "PUT", body: payload });
}

export function patchOrganizationTypeApi(id: number, payload: Partial<OrganizationTypePayload>) {
  return apiRequest<ApiOrganizationType>(`organization-types/${id}/`, { method: "PATCH", body: payload });
}

export function deleteOrganizationTypeApi(id: number) {
  return apiRequest<void>(`organization-types/${id}/`, { method: "DELETE" });
}

/* -------------------------------- Organizations -------------------------------- */

export function listOrganizationsApi(params?: {
  organization_type?: number;
  status?: OrganizationStatus;
  is_verified?: boolean;
  primary_location?: number;
  registration_number?: string;
  tax_id?: string;
  name?: string;
  search?: string;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiOrganizationFull>>(`organizations/${buildQueryString(params)}`, { auth: false });
}

export function getOrganizationApi(id: number) {
  return apiRequest<ApiOrganizationFull>(`organizations/${id}/`, { auth: false });
}

/** Every field except `id`/`created_at` is directly writable per the guide —
 * there's no split create/update serializer for Organizations. */
export interface OrganizationPayload {
  name: string;
  organization_type: number;
  registration_number?: string | null;
  tax_id?: string | null;
  primary_location?: number | null;
  primary_contact_user?: number | null;
  founded_date?: string | null;
  is_verified?: boolean;
  reliability_score?: string;
  status?: OrganizationStatus;
}

export function createOrganizationApi(payload: OrganizationPayload) {
  return apiRequest<ApiOrganizationFull>("organizations/", { method: "POST", body: payload });
}

export function updateOrganizationApi(id: number, payload: OrganizationPayload) {
  return apiRequest<ApiOrganizationFull>(`organizations/${id}/`, { method: "PUT", body: payload });
}

export function patchOrganizationApi(id: number, payload: Partial<OrganizationPayload>) {
  return apiRequest<ApiOrganizationFull>(`organizations/${id}/`, { method: "PATCH", body: payload });
}

export function deleteOrganizationApi(id: number) {
  return apiRequest<void>(`organizations/${id}/`, { method: "DELETE" });
}

/* ----------------------------- Organization members ----------------------------- */
/* Staff-only for every action, including reads — no public visibility. */

export function listOrganizationMembersApi(params?: {
  user?: number;
  organization?: number;
  member_role?: string;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiOrganizationMember>>(`organization-members/${buildQueryString(params)}`);
}

export function getOrganizationMemberApi(id: number) {
  return apiRequest<ApiOrganizationMember>(`organization-members/${id}/`);
}

export function createOrganizationMemberApi(payload: { user: number; organization: number; member_role?: string }) {
  return apiRequest<ApiOrganizationMember>("organization-members/", { method: "POST", body: payload });
}

/** `user`/`organization` are immutable once created — only `member_role` is
 * writable via update; to move a user, delete and recreate the membership. */
export function updateOrganizationMemberApi(id: number, payload: { member_role: string }) {
  return apiRequest<ApiOrganizationMember>(`organization-members/${id}/`, {
    method: "PUT",
    body: payload,
  });
}

export function patchOrganizationMemberApi(id: number, payload: { member_role: string }) {
  return apiRequest<ApiOrganizationMember>(`organization-members/${id}/`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteOrganizationMemberApi(id: number) {
  return apiRequest<void>(`organization-members/${id}/`, { method: "DELETE" });
}
