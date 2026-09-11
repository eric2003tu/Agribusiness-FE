import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StaffAccessNotice } from "@/components/staff-access-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/data-table";
import { useApiList } from "@/hooks/use-api-list";
import { apiErrorMessage, apiFieldErrors, ApiError } from "@/lib/api/client";
import { listCategoriesApi, listLocationsApi, listUomsApi } from "@/lib/api/reference";
import { listOrganizationsApi } from "@/lib/api/organizations";
import { listUsersApi } from "@/lib/api/users";
import {
  createProductApi,
  createVariantApi,
  deleteProductApi,
  deleteVariantApi,
  listProductsApi,
  listVariantsApi,
  patchProductApi,
  patchVariantApi,
  type ProductPayload,
  type VariantPayload,
} from "@/lib/api/products";
import {
  createInventoryApi,
  createWarehouseApi,
  deleteInventoryApi,
  deleteWarehouseApi,
  listInventoryApi,
  listWarehousesApi,
  patchInventoryApi,
  patchWarehouseApi,
  type InventoryCreatePayload,
  type WarehouseCreatePayload,
} from "@/lib/api/inventory";
import {
  createPayMethodApi,
  deletePayMethodApi,
  listPayMethodsApi,
  patchPayMethodApi,
} from "@/lib/api/payments";
import {
  createListingApi,
  createSourcingRequestApi,
  deleteListingApi,
  deleteSourcingRequestApi,
  listListingsApi,
  listSourcingRequestsApi,
  patchListingApi,
  patchSourcingRequestApi,
  type ListingCreatePayload,
  type SourcingRequestCreatePayload,
} from "@/lib/api/listings";
import type {
  ApiCategory,
  ApiLocationFull,
  ApiOrganizationFull,
  ApiUom,
  ApiUser,
} from "@/lib/api/types";
import type { ApiInventory, ApiListing, ApiPayMethod, ApiProduct, ApiSourcingRequest, ApiVariant, ApiWarehouse, ListingScope, ListingStatus, ProdType, SourcingRequestStatus, WarehouseType } from "@/lib/api/types";

export const Route = createFileRoute("/catalog-data")({
  head: () => ({
    meta: [
      { title: "Catalog — Agribridge" },
      { name: "description", content: "Manage products, variants, warehouses, listings and sourcing requests on the live API." },
    ],
  }),
  component: CatalogDataPage,
});

function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function LoadMoreButton({ hasMore, loadMore }: { hasMore: boolean; loadMore: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  if (!hasMore) return null;
  return (
    <div className="flex justify-center py-3">
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await loadMore();
          setBusy(false);
        }}
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        Load more from server
      </Button>
    </div>
  );
}

type OwnerKind = "user" | "organization";

function OwnerPicker({
  users,
  organizations,
  ownerKind,
  setOwnerKind,
  ownerId,
  setOwnerId,
  userLabel = "User",
  orgLabel = "Organization",
}: {
  users: ApiUser[];
  organizations: ApiOrganizationFull[];
  ownerKind: OwnerKind;
  setOwnerKind: (k: OwnerKind) => void;
  ownerId: string;
  setOwnerId: (id: string) => void;
  userLabel?: string;
  orgLabel?: string;
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label>Owner type</Label>
        <Select value={ownerKind} onValueChange={(v) => { setOwnerKind(v as OwnerKind); setOwnerId(""); }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">{userLabel}</SelectItem>
            <SelectItem value="organization">{orgLabel}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>{ownerKind === "user" ? userLabel : orgLabel}</Label>
        <Select value={ownerId} onValueChange={setOwnerId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder={`Select ${ownerKind === "user" ? "a user" : "an organization"}`} />
          </SelectTrigger>
          <SelectContent>
            {ownerKind === "user"
              ? users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.full_name} ({u.phone})
                  </SelectItem>
                ))
              : organizations.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.name}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

/* --------------------------------- Products -------------------------------- */

function ProductsTab({ categories, uoms, organizations }: { categories: ApiCategory[]; uoms: ApiUom[]; organizations: ApiOrganizationFull[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listProductsApi({ page_size: 50 }), []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [prodType, setProdType] = useState<ProdType>("produce");
  const [brandOrgId, setBrandOrgId] = useState("none");
  const [defaultUomId, setDefaultUomId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const leafCategories = categories.filter((c) => c.is_leaf);

  function startEdit(p: ApiProduct) {
    setEditingId(p.id);
    setSku(p.sku);
    setName(p.name);
    setSlug(p.slug);
    setCategoryId(String(p.category));
    setProdType(p.prod_type);
    setBrandOrgId(p.brand_org ? String(p.brand_org) : "none");
    setDefaultUomId(String(p.default_uom));
    setIsActive(p.is_active);
    setFormError("");
    setFieldErrors({});
  }
  function resetForm() {
    setEditingId(null);
    setSku("");
    setName("");
    setSlug("");
    setCategoryId("");
    setProdType("produce");
    setBrandOrgId("none");
    setDefaultUomId("");
    setIsActive(true);
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sku.trim() || !name.trim() || !slug.trim() || !categoryId || !defaultUomId) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    const payload: ProductPayload = {
      sku: sku.trim(),
      name: name.trim(),
      slug: slug.trim(),
      category: Number(categoryId),
      prod_type: prodType,
      default_uom: Number(defaultUomId),
      ...(brandOrgId === "none" ? {} : { brand_org: Number(brandOrgId) }),
      is_active: isActive,
    };
    try {
      if (editingId) await patchProductApi(editingId, payload);
      else await createProductApi(payload);
      resetForm();
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteProductApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiProduct>[] = [
    { key: "sku", header: "SKU", render: (p) => p.sku, exportValue: (p) => p.sku },
    { key: "name", header: "Name", render: (p) => p.name, exportValue: (p) => p.name },
    { key: "type", header: "Type", render: (p) => <Badge variant="secondary">{p.prod_type}</Badge>, exportValue: (p) => p.prod_type },
    {
      key: "category",
      header: "Category",
      render: (p) => categories.find((c) => c.id === p.category)?.name ?? `#${p.category}`,
      exportValue: (p) => categories.find((c) => c.id === p.category)?.name ?? "",
    },
    {
      key: "uom",
      header: "Default unit",
      render: (p) => uoms.find((u) => u.id === p.default_uom)?.name ?? `#${p.default_uom}`,
      exportValue: (p) => uoms.find((u) => u.id === p.default_uom)?.name ?? "",
    },
    { key: "active", header: "Active", render: (p) => (p.is_active ? "Yes" : "No"), exportValue: (p) => (p.is_active ? "yes" : "no") },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(p)}>Edit</Button>
          <Button size="sm" variant="outline" onClick={() => void remove(p.id)}>Delete</Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit product" : "Add a product"}</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>SKU</Label>
            <Input className="w-36" value={sku} onChange={(e) => setSku(e.target.value)} required />
            {fieldErrors["sku"] && <p className="text-xs text-destructive">{fieldErrors["sku"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input className="w-44" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Slug</Label>
            <Input className="w-36" value={slug} onChange={(e) => setSlug(e.target.value)} required />
            {fieldErrors["slug"] && <p className="text-xs text-destructive">{fieldErrors["slug"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Category (leaf only)</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {leafCategories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors["category"] && <p className="text-xs text-destructive">{fieldErrors["category"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={prodType} onValueChange={(v) => setProdType(v as ProdType)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="produce">Produce</SelectItem>
                <SelectItem value="input">Input</SelectItem>
                <SelectItem value="service">Service</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Default unit</Label>
            <Select value={defaultUomId} onValueChange={setDefaultUomId}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {uoms.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Brand (org, optional)</Label>
            <Select value={brandOrgId} onValueChange={setBrandOrgId}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
            <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
            Active
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>}
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(p) => String(p.id)}
            searchFields={(p) => `${p.sku} ${p.name} ${p.slug}`}
            exportFileName="products"
            paginate
            searchPlaceholder="Search by SKU, name or slug…"
            emptyMessage="No products yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- Variants -------------------------------- */

function VariantsTab({ products }: { products: ApiProduct[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listVariantsApi({ page_size: 50 }), []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [productId, setProductId] = useState("");
  const [variantSku, setVariantSku] = useState("");
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function startEdit(v: ApiVariant) {
    setEditingId(v.id);
    setProductId(String(v.product));
    setVariantSku(v.variant_sku);
    setName(v.name);
    setBarcode(v.barcode ?? "");
    setWeightKg(v.weight_kg ?? "");
    setIsActive(v.is_active);
    setFormError("");
    setFieldErrors({});
  }
  function resetForm() {
    setEditingId(null);
    setProductId("");
    setVariantSku("");
    setName("");
    setBarcode("");
    setWeightKg("");
    setIsActive(true);
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !variantSku.trim() || !name.trim()) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    const payload: VariantPayload = {
      product: Number(productId),
      variant_sku: variantSku.trim(),
      name: name.trim(),
      ...(barcode.trim() ? { barcode: barcode.trim() } : {}),
      ...(weightKg.trim() ? { weight_kg: weightKg.trim() } : {}),
      is_active: isActive,
    };
    try {
      if (editingId) await patchVariantApi(editingId, payload);
      else await createVariantApi(payload);
      resetForm();
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteVariantApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiVariant>[] = [
    { key: "sku", header: "Variant SKU", render: (v) => v.variant_sku, exportValue: (v) => v.variant_sku },
    { key: "name", header: "Name", render: (v) => v.name, exportValue: (v) => v.name },
    {
      key: "product",
      header: "Product",
      render: (v) => products.find((p) => p.id === v.product)?.name ?? `#${v.product}`,
      exportValue: (v) => products.find((p) => p.id === v.product)?.name ?? "",
    },
    { key: "weight", header: "Weight (kg)", render: (v) => v.weight_kg ?? "—", exportValue: (v) => v.weight_kg ?? "" },
    { key: "active", header: "Active", render: (v) => (v.is_active ? "Yes" : "No"), exportValue: (v) => (v.is_active ? "yes" : "no") },
    {
      key: "actions",
      header: "",
      render: (v) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(v)}>Edit</Button>
          <Button size="sm" variant="outline" onClick={() => void remove(v.id)}>Delete</Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit variant" : "Add a variant"}</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={products.length ? "Select" : "No products yet"} />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Variant SKU</Label>
            <Input className="w-40" value={variantSku} onChange={(e) => setVariantSku(e.target.value)} required />
            {fieldErrors["variant_sku"] && <p className="text-xs text-destructive">{fieldErrors["variant_sku"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input className="w-48" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Barcode</Label>
            <Input className="w-36" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
            {fieldErrors["barcode"] && <p className="text-xs text-destructive">{fieldErrors["barcode"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Weight (kg)</Label>
            <Input className="w-28" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="50.000" />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
            <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
            Active
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>}
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(v) => String(v.id)}
            searchFields={(v) => `${v.variant_sku} ${v.name} ${v.barcode ?? ""}`}
            exportFileName="variants"
            paginate
            searchPlaceholder="Search by SKU, name or barcode…"
            emptyMessage="No variants yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- Warehouses -------------------------------- */

const WAREHOUSE_TYPES: WarehouseType[] = ["farm_store", "cold_storage", "distribution_center"];

function WarehousesTab({ users, organizations, addresses }: { users: ApiUser[]; organizations: ApiOrganizationFull[]; addresses: ApiLocationFull[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listWarehousesApi({ page_size: 50 }), []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [ownerKind, setOwnerKind] = useState<OwnerKind>("organization");
  const [ownerId, setOwnerId] = useState("");
  const [name, setName] = useState("");
  const [whType, setWhType] = useState<WarehouseType>("farm_store");
  const [addressId, setAddressId] = useState("");
  const [capacityKg, setCapacityKg] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function startEdit(w: ApiWarehouse) {
    setEditingId(w.id);
    setName(w.name);
    setWhType(w.wh_type);
    setAddressId(String(w.address));
    setCapacityKg(w.capacity_kg ?? "");
    setFormError("");
    setFieldErrors({});
  }
  function resetForm() {
    setEditingId(null);
    setOwnerKind("organization");
    setOwnerId("");
    setName("");
    setWhType("farm_store");
    setAddressId("");
    setCapacityKg("");
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !addressId || (!editingId && !ownerId)) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    try {
      if (editingId) {
        await patchWarehouseApi(editingId, {
          name: name.trim(),
          wh_type: whType,
          address: Number(addressId),
          ...(capacityKg.trim() ? { capacity_kg: capacityKg.trim() } : {}),
        });
      } else {
        const payload: WarehouseCreatePayload = {
          name: name.trim(),
          wh_type: whType,
          address: Number(addressId),
          ...(ownerKind === "user" ? { owner_user: Number(ownerId) } : { owner_org: Number(ownerId) }),
          ...(capacityKg.trim() ? { capacity_kg: capacityKg.trim() } : {}),
        };
        await createWarehouseApi(payload);
      }
      resetForm();
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteWarehouseApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  function ownerLabel(w: ApiWarehouse) {
    if (w.owner_user) return users.find((u) => u.id === w.owner_user)?.full_name ?? `User #${w.owner_user}`;
    if (w.owner_org) return organizations.find((o) => o.id === w.owner_org)?.name ?? `Org #${w.owner_org}`;
    return "—";
  }

  const columns: Column<ApiWarehouse>[] = [
    { key: "name", header: "Name", render: (w) => w.name, exportValue: (w) => w.name },
    { key: "owner", header: "Owner", render: ownerLabel, exportValue: ownerLabel },
    { key: "type", header: "Type", render: (w) => <Badge variant="secondary">{w.wh_type}</Badge>, exportValue: (w) => w.wh_type },
    { key: "capacity", header: "Capacity (kg)", render: (w) => w.capacity_kg ?? "—", exportValue: (w) => w.capacity_kg ?? "" },
    {
      key: "actions",
      header: "",
      render: (w) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(w)}>Edit</Button>
          <Button size="sm" variant="outline" onClick={() => void remove(w.id)}>Delete</Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit warehouse" : "Add a warehouse"}</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          {!editingId && (
            <OwnerPicker
              users={users}
              organizations={organizations}
              ownerKind={ownerKind}
              setOwnerKind={setOwnerKind}
              ownerId={ownerId}
              setOwnerId={setOwnerId}
            />
          )}
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input className="w-44" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={whType} onValueChange={(v) => setWhType(v as WarehouseType)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WAREHOUSE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Address (location)</Label>
            <Select value={addressId} onValueChange={setAddressId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={addresses.length ? "Select" : "No locations yet"} />
              </SelectTrigger>
              <SelectContent>
                {addresses.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors["address"] && <p className="text-xs text-destructive">{fieldErrors["address"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Capacity (kg)</Label>
            <Input className="w-32" value={capacityKg} onChange={(e) => setCapacityKg(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>}
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(w) => String(w.id)}
            searchFields={(w) => `${w.name} ${ownerLabel(w)}`}
            exportFileName="warehouses"
            paginate
            searchPlaceholder="Search by name or owner…"
            emptyMessage="No warehouses yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- Inventory -------------------------------- */

function InventoryTab({ variants, warehouses }: { variants: ApiVariant[]; warehouses: ApiWarehouse[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listInventoryApi({ page_size: 50 }), []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [variantId, setVariantId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [qtyOnHand, setQtyOnHand] = useState("0");
  const [qtyReserved, setQtyReserved] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function startEdit(inv: ApiInventory) {
    setEditingId(inv.id);
    setVariantId(String(inv.variant));
    setWarehouseId(String(inv.warehouse));
    setQtyOnHand(inv.qty_on_hand);
    setQtyReserved(inv.qty_reserved);
    setReorderLevel(inv.reorder_level ?? "");
    setFormError("");
    setFieldErrors({});
  }
  function resetForm() {
    setEditingId(null);
    setVariantId("");
    setWarehouseId("");
    setQtyOnHand("0");
    setQtyReserved("0");
    setReorderLevel("");
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId && (!variantId || !warehouseId)) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    try {
      if (editingId) {
        await patchInventoryApi(editingId, {
          qty_on_hand: qtyOnHand,
          qty_reserved: qtyReserved,
          ...(reorderLevel.trim() ? { reorder_level: reorderLevel.trim() } : {}),
        });
      } else {
        const payload: InventoryCreatePayload = {
          variant: Number(variantId),
          warehouse: Number(warehouseId),
          qty_on_hand: qtyOnHand,
          qty_reserved: qtyReserved,
          ...(reorderLevel.trim() ? { reorder_level: reorderLevel.trim() } : {}),
        };
        await createInventoryApi(payload);
      }
      resetForm();
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteInventoryApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiInventory>[] = [
    {
      key: "variant",
      header: "Variant",
      render: (i) => variants.find((v) => v.id === i.variant)?.name ?? `#${i.variant}`,
      exportValue: (i) => variants.find((v) => v.id === i.variant)?.name ?? "",
    },
    {
      key: "warehouse",
      header: "Warehouse",
      render: (i) => warehouses.find((w) => w.id === i.warehouse)?.name ?? `#${i.warehouse}`,
      exportValue: (i) => warehouses.find((w) => w.id === i.warehouse)?.name ?? "",
    },
    { key: "onhand", header: "On hand", render: (i) => i.qty_on_hand, exportValue: (i) => i.qty_on_hand },
    { key: "reserved", header: "Reserved", render: (i) => i.qty_reserved, exportValue: (i) => i.qty_reserved },
    { key: "reorder", header: "Reorder level", render: (i) => i.reorder_level ?? "—", exportValue: (i) => i.reorder_level ?? "" },
    {
      key: "actions",
      header: "",
      render: (i) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(i)}>Edit</Button>
          <Button size="sm" variant="outline" onClick={() => void remove(i.id)}>Delete</Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit inventory record" : "Add an inventory record"}</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          {!editingId && (
            <>
              <div className="grid gap-2">
                <Label>Variant</Label>
                <Select value={variantId} onValueChange={setVariantId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={variants.length ? "Select" : "No variants yet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Warehouse</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={warehouses.length ? "Select" : "No warehouses yet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors["detail"] && <p className="text-xs text-destructive">{fieldErrors["detail"]}</p>}
              </div>
            </>
          )}
          <div className="grid gap-2">
            <Label>Qty on hand</Label>
            <Input className="w-28" value={qtyOnHand} onChange={(e) => setQtyOnHand(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Qty reserved</Label>
            <Input className="w-28" value={qtyReserved} onChange={(e) => setQtyReserved(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Reorder level</Label>
            <Input className="w-28" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>}
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(i) => String(i.id)}
            searchFields={(i) => `${variants.find((v) => v.id === i.variant)?.name ?? ""} ${warehouses.find((w) => w.id === i.warehouse)?.name ?? ""}`}
            exportFileName="inventory"
            paginate
            searchPlaceholder="Search by variant or warehouse…"
            emptyMessage="No inventory records yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- Pay methods -------------------------------- */

function PayMethodsTab() {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listPayMethodsApi(), []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [provider, setProvider] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function startEdit(m: ApiPayMethod) {
    setEditingId(m.id);
    setName(m.name);
    setCode(m.code);
    setProvider(m.provider);
    setApiEndpoint(m.api_endpoint);
    setIsActive(m.is_active);
    setFormError("");
    setFieldErrors({});
  }
  function resetForm() {
    setEditingId(null);
    setName("");
    setCode("");
    setProvider("");
    setApiEndpoint("");
    setIsActive(true);
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    const payload = { name: name.trim(), code: code.trim(), provider: provider.trim(), api_endpoint: apiEndpoint.trim(), is_active: isActive };
    try {
      if (editingId) await patchPayMethodApi(editingId, payload);
      else await createPayMethodApi(payload);
      resetForm();
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deletePayMethodApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiPayMethod>[] = [
    { key: "name", header: "Name", render: (m) => m.name, exportValue: (m) => m.name },
    { key: "code", header: "Code", render: (m) => m.code, exportValue: (m) => m.code },
    { key: "provider", header: "Provider", render: (m) => m.provider || "—", exportValue: (m) => m.provider },
    { key: "active", header: "Active", render: (m) => (m.is_active ? "Yes" : "No"), exportValue: (m) => (m.is_active ? "yes" : "no") },
    {
      key: "actions",
      header: "",
      render: (m) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(m)}>Edit</Button>
          <Button size="sm" variant="outline" onClick={() => void remove(m.id)}>Delete</Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit payment method" : "Add a payment method"}</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input className="w-44" value={name} onChange={(e) => setName(e.target.value)} required />
            {fieldErrors["name"] && <p className="text-xs text-destructive">{fieldErrors["name"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Code</Label>
            <Input className="w-36" value={code} onChange={(e) => setCode(e.target.value)} required />
            {fieldErrors["code"] && <p className="text-xs text-destructive">{fieldErrors["code"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Provider</Label>
            <Input className="w-36" value={provider} onChange={(e) => setProvider(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>API endpoint</Label>
            <Input className="w-56" value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
            <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
            Active
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>}
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(m) => String(m.id)}
            searchFields={(m) => `${m.name} ${m.code} ${m.provider}`}
            exportFileName="pay-methods"
            paginate
            searchPlaceholder="Search by name, code or provider…"
            emptyMessage="No payment methods yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- Listings -------------------------------- */

function ListingsTab({
  users,
  organizations,
  variants,
  uoms,
  locations,
}: {
  users: ApiUser[];
  organizations: ApiOrganizationFull[];
  variants: ApiVariant[];
  uoms: ApiUom[];
  locations: ApiLocationFull[];
}) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listListingsApi({ page_size: 50 }), []);
  const [ownerKind, setOwnerKind] = useState<OwnerKind>("user");
  const [ownerId, setOwnerId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [qtyAvailable, setQtyAvailable] = useState("");
  const [uomId, setUomId] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [locationId, setLocationId] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [scope, setScope] = useState<ListingScope>("commercial");
  const [status, setStatus] = useState<ListingStatus>("available");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setOwnerKind("user");
    setOwnerId("");
    setVariantId("");
    setQtyAvailable("");
    setUomId("");
    setUnitPrice("");
    setLocationId("");
    setHarvestDate("");
    setScope("commercial");
    setStatus("available");
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerId || !variantId || !qtyAvailable.trim() || !uomId || !locationId || !harvestDate) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    const payload: ListingCreatePayload = {
      ...(ownerKind === "user" ? { seller_user: Number(ownerId) } : { seller_org: Number(ownerId) }),
      variant: Number(variantId),
      qty_available: qtyAvailable.trim(),
      uom: Number(uomId),
      location: Number(locationId),
      harvest_date: harvestDate,
      scope,
      status,
      ...(unitPrice.trim() ? { unit_price: unitPrice.trim() } : {}),
    };
    try {
      await createListingApi(payload);
      resetForm();
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function setListingStatus(id: number, newStatus: ListingStatus) {
    try {
      await patchListingApi(id, { status: newStatus });
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Update failed.") : "Could not reach the server.");
    }
  }

  async function remove(id: number) {
    try {
      await deleteListingApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  function sellerLabel(l: ApiListing) {
    if (l.seller_user) return users.find((u) => u.id === l.seller_user)?.full_name ?? `User #${l.seller_user}`;
    if (l.seller_org) return organizations.find((o) => o.id === l.seller_org)?.name ?? `Org #${l.seller_org}`;
    return "—";
  }

  const columns: Column<ApiListing>[] = [
    { key: "seller", header: "Seller", render: sellerLabel, exportValue: sellerLabel },
    {
      key: "variant",
      header: "Variant",
      render: (l) => variants.find((v) => v.id === l.variant)?.name ?? `#${l.variant}`,
      exportValue: (l) => variants.find((v) => v.id === l.variant)?.name ?? "",
    },
    { key: "qty", header: "Available", render: (l) => l.qty_available, exportValue: (l) => l.qty_available },
    { key: "price", header: "Unit price", render: (l) => l.unit_price ?? "—", exportValue: (l) => l.unit_price ?? "" },
    {
      key: "location",
      header: "Location",
      render: (l) => locations.find((loc) => loc.id === l.location)?.name ?? `#${l.location}`,
      exportValue: (l) => locations.find((loc) => loc.id === l.location)?.name ?? "",
    },
    { key: "scope", header: "Scope", render: (l) => <Badge variant="secondary">{l.scope}</Badge>, exportValue: (l) => l.scope },
    {
      key: "status",
      header: "Status",
      render: (l) => (
        <Select value={l.status} onValueChange={(v) => void setListingStatus(l.id, v as ListingStatus)}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="available">available</SelectItem>
            <SelectItem value="reserved">reserved</SelectItem>
            <SelectItem value="sold">sold</SelectItem>
            <SelectItem value="expired">expired</SelectItem>
          </SelectContent>
        </Select>
      ),
      exportValue: (l) => l.status,
    },
    {
      key: "actions",
      header: "",
      render: (l) => (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => void remove(l.id)}>Delete</Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Add a listing</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <OwnerPicker
            users={users}
            organizations={organizations}
            ownerKind={ownerKind}
            setOwnerKind={setOwnerKind}
            ownerId={ownerId}
            setOwnerId={setOwnerId}
            userLabel="Seller (user)"
            orgLabel="Seller (org)"
          />
          <div className="grid gap-2">
            <Label>Variant</Label>
            <Select value={variantId} onValueChange={setVariantId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={variants.length ? "Select" : "No variants yet"} />
              </SelectTrigger>
              <SelectContent>
                {variants.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Qty available</Label>
            <Input className="w-28" value={qtyAvailable} onChange={(e) => setQtyAvailable(e.target.value)} placeholder="120.500" />
          </div>
          <div className="grid gap-2">
            <Label>Unit</Label>
            <Select value={uomId} onValueChange={setUomId}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {uoms.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Unit price</Label>
            <Input className="w-28" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={locations.length ? "Select" : "No locations yet"} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Harvest date</Label>
            <Input type="date" className="w-40" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Scope</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as ListingScope)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commercial">commercial</SelectItem>
                <SelectItem value="peer">peer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </Button>
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(l) => String(l.id)}
            searchFields={(l) => `${sellerLabel(l)} ${l.grade} ${l.status}`}
            exportFileName="listings"
            paginate
            searchPlaceholder="Search by seller, grade or status…"
            emptyMessage="No listings yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- Sourcing requests -------------------------------- */

function RequestsTab({
  users,
  organizations,
  products,
  uoms,
  locations,
}: {
  users: ApiUser[];
  organizations: ApiOrganizationFull[];
  products: ApiProduct[];
  uoms: ApiUom[];
  locations: ApiLocationFull[];
}) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listSourcingRequestsApi({ page_size: 50 }), []);
  const [ownerKind, setOwnerKind] = useState<OwnerKind>("user");
  const [ownerId, setOwnerId] = useState("");
  const [productId, setProductId] = useState("");
  const [qtyNeeded, setQtyNeeded] = useState("");
  const [uomId, setUomId] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [deliveryLocId, setDeliveryLocId] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setOwnerKind("user");
    setOwnerId("");
    setProductId("");
    setQtyNeeded("");
    setUomId("");
    setTargetPrice("");
    setDeliveryLocId("");
    setNeededBy("");
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerId || !productId || !qtyNeeded.trim() || !uomId || !deliveryLocId || !neededBy) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    const payload: SourcingRequestCreatePayload = {
      ...(ownerKind === "user" ? { buyer_user: Number(ownerId) } : { buyer_org: Number(ownerId) }),
      product: Number(productId),
      qty_needed: qtyNeeded.trim(),
      uom: Number(uomId),
      delivery_loc: Number(deliveryLocId),
      needed_by: neededBy,
      ...(targetPrice.trim() ? { target_price: targetPrice.trim() } : {}),
    };
    try {
      await createSourcingRequestApi(payload);
      resetForm();
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function setReqStatus(id: number, newStatus: SourcingRequestStatus) {
    try {
      await patchSourcingRequestApi(id, { status: newStatus });
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Update failed.") : "Could not reach the server.");
    }
  }

  async function remove(id: number) {
    try {
      await deleteSourcingRequestApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  function buyerLabel(r: ApiSourcingRequest) {
    if (r.buyer_user) return users.find((u) => u.id === r.buyer_user)?.full_name ?? `User #${r.buyer_user}`;
    if (r.buyer_org) return organizations.find((o) => o.id === r.buyer_org)?.name ?? `Org #${r.buyer_org}`;
    return "—";
  }

  const columns: Column<ApiSourcingRequest>[] = [
    { key: "buyer", header: "Buyer", render: buyerLabel, exportValue: buyerLabel },
    {
      key: "product",
      header: "Product",
      render: (r) => products.find((p) => p.id === r.product)?.name ?? `#${r.product}`,
      exportValue: (r) => products.find((p) => p.id === r.product)?.name ?? "",
    },
    { key: "qty", header: "Needed", render: (r) => r.qty_needed, exportValue: (r) => r.qty_needed },
    { key: "target", header: "Target price", render: (r) => r.target_price ?? "—", exportValue: (r) => r.target_price ?? "" },
    { key: "needed_by", header: "Needed by", render: (r) => r.needed_by, exportValue: (r) => r.needed_by },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Select value={r.status} onValueChange={(v) => void setReqStatus(r.id, v as SourcingRequestStatus)}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">open</SelectItem>
            <SelectItem value="matched">matched</SelectItem>
            <SelectItem value="partially_filled">partially_filled</SelectItem>
            <SelectItem value="filled">filled</SelectItem>
            <SelectItem value="cancelled">cancelled</SelectItem>
          </SelectContent>
        </Select>
      ),
      exportValue: (r) => r.status,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => void remove(r.id)}>Delete</Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Add a sourcing request</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <OwnerPicker
            users={users}
            organizations={organizations}
            ownerKind={ownerKind}
            setOwnerKind={setOwnerKind}
            ownerId={ownerId}
            setOwnerId={setOwnerId}
            userLabel="Buyer (user)"
            orgLabel="Buyer (org)"
          />
          <div className="grid gap-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={products.length ? "Select" : "No products yet"} />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Qty needed</Label>
            <Input className="w-28" value={qtyNeeded} onChange={(e) => setQtyNeeded(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Unit</Label>
            <Select value={uomId} onValueChange={setUomId}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {uoms.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Target price</Label>
            <Input className="w-28" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Delivery location</Label>
            <Select value={deliveryLocId} onValueChange={setDeliveryLocId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={locations.length ? "Select" : "No locations yet"} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Needed by</Label>
            <Input type="date" className="w-40" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </Button>
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(r) => String(r.id)}
            searchFields={(r) => `${buyerLabel(r)} ${r.status}`}
            exportFileName="sourcing-requests"
            paginate
            searchPlaceholder="Search by buyer or status…"
            emptyMessage="No sourcing requests yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* ----------------------------------- Page ----------------------------------- */

function CatalogDataPage() {
  const categoriesList = useApiList(() => listCategoriesApi({ page_size: 200 }), []);
  const uomsList = useApiList(() => listUomsApi({ page_size: 100 }), []);
  const organizationsList = useApiList(() => listOrganizationsApi({ page_size: 100 }), []);
  const usersList = useApiList(() => listUsersApi({ page_size: 100 }), []);
  const locationsList = useApiList(() => listLocationsApi({ page_size: 100 }), []);
  const productsList = useApiList(() => listProductsApi({ page_size: 100 }), []);
  const variantsList = useApiList(() => listVariantsApi({ page_size: 100 }), []);
  const warehousesList = useApiList(() => listWarehousesApi({ page_size: 100 }), []);

  return (
    <AppShell
      title="Catalog"
      description="Manage products, variants, warehouses, listings and sourcing requests on the live API."
    >
      <StaffAccessNotice />
      <Tabs defaultValue="products">
        <TabsList className="flex-wrap">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="pay-methods">Payment methods</TabsTrigger>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="requests">Sourcing requests</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ProductsTab categories={categoriesList.items} uoms={uomsList.items} organizations={organizationsList.items} />
        </TabsContent>
        <TabsContent value="variants">
          <VariantsTab products={productsList.items} />
        </TabsContent>
        <TabsContent value="warehouses">
          <WarehousesTab users={usersList.items} organizations={organizationsList.items} addresses={locationsList.items} />
        </TabsContent>
        <TabsContent value="inventory">
          <InventoryTab variants={variantsList.items} warehouses={warehousesList.items} />
        </TabsContent>
        <TabsContent value="pay-methods">
          <PayMethodsTab />
        </TabsContent>
        <TabsContent value="listings">
          <ListingsTab
            users={usersList.items}
            organizations={organizationsList.items}
            variants={variantsList.items}
            uoms={uomsList.items}
            locations={locationsList.items}
          />
        </TabsContent>
        <TabsContent value="requests">
          <RequestsTab
            users={usersList.items}
            organizations={organizationsList.items}
            products={productsList.items}
            uoms={uomsList.items}
            locations={locationsList.items}
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
