import { apiRequest, buildQueryString, type ApiPage } from "./client";
import type { ApiProduct, ApiProductImage, ApiVariant, ProdType } from "./types";

/* --------------------------------- Products -------------------------------- */

export function listProductsApi(params?: {
  category?: number;
  prod_type?: ProdType;
  brand_org?: number;
  default_uom?: number;
  is_active?: boolean;
  name?: string;
  search?: string;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiProduct>>(`products/${buildQueryString(params)}`, { auth: false });
}

export function getProductApi(id: number) {
  return apiRequest<ApiProduct>(`products/${id}/`, { auth: false });
}

export interface ProductPayload {
  sku: string;
  name: string;
  slug: string;
  category: number;
  prod_type: ProdType;
  default_uom: number;
  brand_org?: number | null;
  shelf_life_days?: number | null;
  storage_notes?: string;
  is_active?: boolean;
}

/** Create/update/patch all share one write serializer that omits `created_at`
 * even though it's stamped server-side — confirmed by directly testing the
 * live server (re-`GET` afterward if you need it). */
export function createProductApi(payload: ProductPayload) {
  return apiRequest<Omit<ApiProduct, "created_at">>("products/", { method: "POST", body: payload });
}

export function updateProductApi(id: number, payload: ProductPayload) {
  return apiRequest<Omit<ApiProduct, "created_at">>(`products/${id}/`, { method: "PUT", body: payload });
}

export function patchProductApi(id: number, payload: Partial<ProductPayload>) {
  return apiRequest<Omit<ApiProduct, "created_at">>(`products/${id}/`, { method: "PATCH", body: payload });
}

export function deleteProductApi(id: number) {
  return apiRequest<void>(`products/${id}/`, { method: "DELETE" });
}

/* --------------------------------- Variants -------------------------------- */

export function listVariantsApi(params?: {
  product?: number;
  is_active?: boolean;
  name?: string;
  search?: string;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiVariant>>(`variants/${buildQueryString(params)}`, { auth: false });
}

export function getVariantApi(id: number) {
  return apiRequest<ApiVariant>(`variants/${id}/`, { auth: false });
}

export interface VariantPayload {
  product: number;
  variant_sku: string;
  name: string;
  barcode?: string | null;
  weight_kg?: string | null;
  is_active?: boolean;
}

export function createVariantApi(payload: VariantPayload) {
  return apiRequest<ApiVariant>("variants/", { method: "POST", body: payload });
}

export function updateVariantApi(id: number, payload: VariantPayload) {
  return apiRequest<ApiVariant>(`variants/${id}/`, { method: "PUT", body: payload });
}

export function patchVariantApi(id: number, payload: Partial<VariantPayload>) {
  return apiRequest<ApiVariant>(`variants/${id}/`, { method: "PATCH", body: payload });
}

export function deleteVariantApi(id: number) {
  return apiRequest<void>(`variants/${id}/`, { method: "DELETE" });
}

/* ------------------------------- Product images ------------------------------ */
/* Real multipart file uploads, not URL strings — see the guide's "File uploads" convention. */

export function listProductImagesApi(params?: { variant?: number; is_primary?: boolean; page_size?: number }) {
  return apiRequest<ApiPage<ApiProductImage>>(`product-images/${buildQueryString(params)}`, { auth: false });
}

export function getProductImageApi(id: number) {
  return apiRequest<ApiProductImage>(`product-images/${id}/`, { auth: false });
}

export interface ProductImageUpload {
  variant: number;
  image: File;
  display_order?: number;
  is_primary?: boolean;
}

function productImageFormData(payload: Partial<ProductImageUpload>): FormData {
  const form = new FormData();
  if (payload.variant !== undefined) form.append("variant", String(payload.variant));
  if (payload.image !== undefined) form.append("image", payload.image);
  if (payload.display_order !== undefined) form.append("display_order", String(payload.display_order));
  if (payload.is_primary !== undefined) form.append("is_primary", String(payload.is_primary));
  return form;
}

export function createProductImageApi(payload: ProductImageUpload) {
  return apiRequest<ApiProductImage>("product-images/", { method: "POST", body: productImageFormData(payload) });
}

export function updateProductImageApi(id: number, payload: ProductImageUpload) {
  return apiRequest<ApiProductImage>(`product-images/${id}/`, {
    method: "PUT",
    body: productImageFormData(payload),
  });
}

export function patchProductImageApi(id: number, payload: Partial<ProductImageUpload>) {
  return apiRequest<ApiProductImage>(`product-images/${id}/`, {
    method: "PATCH",
    body: productImageFormData(payload),
  });
}

export function deleteProductImageApi(id: number) {
  return apiRequest<void>(`product-images/${id}/`, { method: "DELETE" });
}
