import { apiRequest, buildQueryString, type ApiPage } from "./client";
import type { ApiInventory, ApiWarehouse, WarehouseType } from "./types";

/* --------------------------------- Warehouses -------------------------------- */
/* Staff-only for every action. */

export function listWarehousesApi(params?: {
  owner_user?: number;
  owner_org?: number;
  wh_type?: WarehouseType;
  name?: string;
  page_size?: number;
}) {
  return apiRequest<ApiPage<ApiWarehouse>>(`warehouses/${buildQueryString(params)}`);
}

export function getWarehouseApi(id: number) {
  return apiRequest<ApiWarehouse>(`warehouses/${id}/`);
}

/** Exactly one of `owner_user`/`owner_org` required on create; both are
 * immutable after creation — the update payload omits them entirely. */
export interface WarehouseCreatePayload {
  name: string;
  owner_user?: number | null;
  owner_org?: number | null;
  wh_type: WarehouseType;
  address: number;
  capacity_kg?: string | null;
}

export function createWarehouseApi(payload: WarehouseCreatePayload) {
  return apiRequest<ApiWarehouse>("warehouses/", { method: "POST", body: payload });
}

export interface WarehouseUpdatePayload {
  name: string;
  wh_type: WarehouseType;
  address: number;
  capacity_kg?: string | null;
}

export function updateWarehouseApi(id: number, payload: WarehouseUpdatePayload) {
  return apiRequest<ApiWarehouse>(`warehouses/${id}/`, { method: "PUT", body: payload });
}

export function patchWarehouseApi(id: number, payload: Partial<WarehouseUpdatePayload>) {
  return apiRequest<ApiWarehouse>(`warehouses/${id}/`, { method: "PATCH", body: payload });
}

export function deleteWarehouseApi(id: number) {
  return apiRequest<void>(`warehouses/${id}/`, { method: "DELETE" });
}

/* --------------------------------- Inventory -------------------------------- */
/* Staff-only for every action. */

export function listInventoryApi(params?: { variant?: number; warehouse?: number; page_size?: number }) {
  return apiRequest<ApiPage<ApiInventory>>(`inventory/${buildQueryString(params)}`);
}

export function getInventoryApi(id: number) {
  return apiRequest<ApiInventory>(`inventory/${id}/`);
}

export interface InventoryCreatePayload {
  variant: number;
  warehouse: number;
  qty_on_hand?: string;
  qty_reserved?: string;
  reorder_level?: string | null;
  last_counted?: string | null;
}

export function createInventoryApi(payload: InventoryCreatePayload) {
  return apiRequest<ApiInventory>("inventory/", { method: "POST", body: payload });
}

/** `variant`/`warehouse` are immutable after creation — delete and recreate to move stock. */
export interface InventoryUpdatePayload {
  qty_on_hand: string;
  qty_reserved: string;
  reorder_level?: string | null;
  last_counted?: string | null;
}

export function updateInventoryApi(id: number, payload: InventoryUpdatePayload) {
  return apiRequest<ApiInventory>(`inventory/${id}/`, { method: "PUT", body: payload });
}

export function patchInventoryApi(id: number, payload: Partial<InventoryUpdatePayload>) {
  return apiRequest<ApiInventory>(`inventory/${id}/`, { method: "PATCH", body: payload });
}

export function deleteInventoryApi(id: number) {
  return apiRequest<void>(`inventory/${id}/`, { method: "DELETE" });
}
