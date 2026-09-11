import { apiRequest, buildQueryString, type ApiPage } from "./client";
import type {
  ApiCategory,
  ApiCurrency,
  ApiLanguage,
  ApiLocation,
  ApiLocationFull,
  ApiLocationLevel,
  ApiUom,
} from "./types";

/* --------------------------------- Languages -------------------------------- */

export function listLanguagesApi(params?: { code?: string; name?: string; search?: string; page_size?: number }) {
  return apiRequest<ApiPage<ApiLanguage>>(`languages/${buildQueryString(params)}`, { auth: false });
}

export function getLanguageApi(id: number) {
  return apiRequest<ApiLanguage>(`languages/${id}/`, { auth: false });
}

export function createLanguageApi(payload: { code: string; name: string }) {
  return apiRequest<ApiLanguage>("languages/", { method: "POST", body: payload });
}

export function updateLanguageApi(id: number, payload: { code: string; name: string }) {
  return apiRequest<ApiLanguage>(`languages/${id}/`, { method: "PUT", body: payload });
}

export function patchLanguageApi(id: number, payload: Partial<{ code: string; name: string }>) {
  return apiRequest<ApiLanguage>(`languages/${id}/`, { method: "PATCH", body: payload });
}

export function deleteLanguageApi(id: number) {
  return apiRequest<void>(`languages/${id}/`, { method: "DELETE" });
}

/* --------------------------------- Currency -------------------------------- */

export function listCurrenciesApi(params?: { code?: string; name?: string; search?: string; page_size?: number }) {
  return apiRequest<ApiPage<ApiCurrency>>(`currencies/${buildQueryString(params)}`, { auth: false });
}

export function getCurrencyApi(id: number) {
  return apiRequest<ApiCurrency>(`currencies/${id}/`, { auth: false });
}

export interface CurrencyPayload {
  code: string;
  name: string;
  symbol: string;
  decimal_places?: number;
}

export function createCurrencyApi(payload: CurrencyPayload) {
  return apiRequest<ApiCurrency>("currencies/", { method: "POST", body: payload });
}

export function updateCurrencyApi(id: number, payload: CurrencyPayload) {
  return apiRequest<ApiCurrency>(`currencies/${id}/`, { method: "PUT", body: payload });
}

export function patchCurrencyApi(id: number, payload: Partial<CurrencyPayload>) {
  return apiRequest<ApiCurrency>(`currencies/${id}/`, { method: "PATCH", body: payload });
}

export function deleteCurrencyApi(id: number) {
  return apiRequest<void>(`currencies/${id}/`, { method: "DELETE" });
}

/* ------------------------------ Location levels ------------------------------ */

/** Read-only — no create/update/delete routes exist for location levels. */
export function listLocationLevelsApi(params?: { depth?: number; search?: string; page_size?: number }) {
  return apiRequest<ApiPage<ApiLocationLevel>>(`location-levels/${buildQueryString(params)}`, { auth: false });
}

export function getLocationLevelApi(id: number) {
  return apiRequest<ApiLocationLevel>(`location-levels/${id}/`, { auth: false });
}

/* --------------------------------- Locations -------------------------------- */

export function listLocationsApi(params?: {
  level?: number;
  parent?: number;
  iso_code?: string;
  name?: string;
  search?: string;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiLocationFull>>(`locations/${buildQueryString(params)}`, { auth: false });
}

export function getLocationApi(id: number) {
  return apiRequest<ApiLocationFull>(`locations/${id}/`, { auth: false });
}

export interface LocationPayload {
  name: string;
  level: number;
  parent?: number | null;
  iso_code?: string;
  currency?: number | null;
  latitude?: string | null;
  longitude?: string | null;
}

export function createLocationApi(payload: LocationPayload) {
  return apiRequest<ApiLocationFull>("locations/", { method: "POST", body: payload });
}

export function updateLocationApi(id: number, payload: LocationPayload) {
  return apiRequest<ApiLocationFull>(`locations/${id}/`, { method: "PUT", body: payload });
}

export function patchLocationApi(id: number, payload: Partial<LocationPayload>) {
  return apiRequest<ApiLocationFull>(`locations/${id}/`, { method: "PATCH", body: payload });
}

export function deleteLocationApi(id: number) {
  return apiRequest<void>(`locations/${id}/`, { method: "DELETE" });
}

/* --------------------------------- Categories -------------------------------- */

export function listCategoriesApi(params?: {
  category_type?: "produce" | "input";
  parent?: number;
  is_leaf?: boolean;
  name?: string;
  search?: string;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiCategory>>(`categories/${buildQueryString(params)}`, { auth: false });
}

export function getCategoryApi(id: number) {
  return apiRequest<ApiCategory>(`categories/${id}/`, { auth: false });
}

export interface CategoryPayload {
  name: string;
  parent?: number | null;
  category_type: "produce" | "input";
  is_leaf?: boolean;
}

export function createCategoryApi(payload: CategoryPayload) {
  return apiRequest<ApiCategory>("categories/", { method: "POST", body: payload });
}

export function updateCategoryApi(id: number, payload: CategoryPayload) {
  return apiRequest<ApiCategory>(`categories/${id}/`, { method: "PUT", body: payload });
}

export function patchCategoryApi(id: number, payload: Partial<CategoryPayload>) {
  return apiRequest<ApiCategory>(`categories/${id}/`, { method: "PATCH", body: payload });
}

export function deleteCategoryApi(id: number) {
  return apiRequest<void>(`categories/${id}/`, { method: "DELETE" });
}

/* ----------------------------- Units of measure ------------------------------ */

export function listUomsApi(params?: {
  base_unit?: number;
  is_base?: boolean;
  name?: string;
  search?: string;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiUom>>(`uoms/${buildQueryString(params)}`, { auth: false });
}

export function getUomApi(id: number) {
  return apiRequest<ApiUom>(`uoms/${id}/`, { auth: false });
}

export interface UomPayload {
  name: string;
  symbol: string;
  base_unit?: number | null;
  conversion_factor?: string | null;
}

export function createUomApi(payload: UomPayload) {
  return apiRequest<ApiUom>("uoms/", { method: "POST", body: payload });
}

export function updateUomApi(id: number, payload: UomPayload) {
  return apiRequest<ApiUom>(`uoms/${id}/`, { method: "PUT", body: payload });
}

export function patchUomApi(id: number, payload: Partial<UomPayload>) {
  return apiRequest<ApiUom>(`uoms/${id}/`, { method: "PATCH", body: payload });
}

export function deleteUomApi(id: number) {
  return apiRequest<void>(`uoms/${id}/`, { method: "DELETE" });
}

// Re-exported for callers that only need the page wrapper type from here.
export type { ApiPage };
export type { ApiLocation };
