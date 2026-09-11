import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Boxes, CheckCircle2, Layers, Loader2, Package, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/stat-card";
import { DataTable, type Column } from "@/components/data-table";
import { useApiList } from "@/hooks/use-api-list";
import { apiErrorMessage, apiFieldErrors, ApiError } from "@/lib/api/client";
import { listCategoriesApi, listUomsApi } from "@/lib/api/reference";
import { listOrganizationsApi } from "@/lib/api/organizations";
import {
  createProductApi,
  deleteProductApi,
  listProductsApi,
  patchProductApi,
  type ProductPayload,
} from "@/lib/api/products";
import type { ApiProduct, ProdType } from "@/lib/api/types";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products — Agribridge" },
      { name: "description", content: "Browse and manage the live AgriBridge product catalog." },
    ],
  }),
  component: ProductsPage,
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

function ProductsPage() {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listProductsApi({ page_size: 50 }), []);
  const categoriesList = useApiList(() => listCategoriesApi({ page_size: 200 }), []);
  const uomsList = useApiList(() => listUomsApi({ page_size: 100 }), []);
  const organizationsList = useApiList(() => listOrganizationsApi({ page_size: 100 }), []);
  const categories = categoriesList.items;
  const uoms = uomsList.items;
  const organizations = organizationsList.items;
  const leafCategories = categories.filter((c) => c.is_leaf);

  const [showForm, setShowForm] = useState(false);
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
    setShowForm(true);
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

  function closeForm() {
    resetForm();
    setShowForm(false);
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
      closeForm();
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
    {
      key: "type",
      header: "Type",
      render: (p) => <Badge variant="secondary">{p.prod_type}</Badge>,
      exportValue: (p) => p.prod_type,
    },
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
    {
      key: "active",
      header: "Active",
      render: (p) => (p.is_active ? "Yes" : "No"),
      exportValue: (p) => (p.is_active ? "yes" : "no"),
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(p.id)}>
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <AppShell
      title="Products"
      description="Browse and manage the live AgriBridge product catalog."
      actions={
        <Button
          onClick={() => {
            if (showForm) closeForm();
            else setShowForm(true);
          }}
        >
          <Plus className="size-4" />
          Add product
        </Button>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Package} title="Total products" value={items.length} tone="brand" />
        <StatCard
          icon={CheckCircle2}
          title="Active"
          value={items.filter((p) => p.is_active).length}
          tone="success"
        />
        <StatCard icon={Layers} title="Produce" value={items.filter((p) => p.prod_type === "produce").length} tone="soft" />
        <StatCard icon={Boxes} title="Inputs" value={items.filter((p) => p.prod_type === "input").length} tone="warning" />
      </div>

      {showForm && (
        <section className="surface-card mb-6 p-5">
          <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit product" : "Add a product"}</h2>
          <ErrorBanner message={formError} />
          <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
            <div className="grid gap-2">
              <Label>SKU</Label>
              <Input className="w-32" value={sku} onChange={(e) => setSku(e.target.value)} required />
              {fieldErrors["sku"] && <p className="text-xs text-destructive">{fieldErrors["sku"]}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input className="w-48" value={name} onChange={(e) => setName(e.target.value)} required />
              {fieldErrors["name"] && <p className="text-xs text-destructive">{fieldErrors["name"]}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Slug</Label>
              <Input className="w-40" value={slug} onChange={(e) => setSlug(e.target.value)} required />
              {fieldErrors["slug"] && <p className="text-xs text-destructive">{fieldErrors["slug"]}</p>}
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
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder={leafCategories.length ? "Select a category" : "No categories yet"} />
                </SelectTrigger>
                <SelectContent>
                  {leafCategories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors["category"] && <p className="text-xs text-destructive">{fieldErrors["category"]}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Default unit</Label>
              <Select value={defaultUomId} onValueChange={setDefaultUomId}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={uoms.length ? "Select" : "None yet"} />
                </SelectTrigger>
                <SelectContent>
                  {uoms.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors["default_uom"] && <p className="text-xs text-destructive">{fieldErrors["default_uom"]}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Brand (optional)</Label>
              <Select value={brandOrgId} onValueChange={setBrandOrgId}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
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
              {editingId ? "Save changes" : "Add product"}
            </Button>
            <Button type="button" variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
          </form>
        </section>
      )}

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(p) => String(p.id)}
            searchFields={(p) => `${p.sku} ${p.name} ${p.prod_type}`}
            exportFileName="products"
            paginate
            searchPlaceholder="Search by SKU, name or type…"
            emptyMessage="No products yet — click “Add product” to create one (staff account required)."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </AppShell>
  );
}
