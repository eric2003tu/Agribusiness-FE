import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApiList } from "@/hooks/use-api-list";
import { getProductApi, listProductsApi, patchProductApi } from "@/lib/api/products";
import { listCategoriesApi, listUomsApi } from "@/lib/api/reference";
import { listOrganizationsApi } from "@/lib/api/organizations";
import { apiErrorMessage, ApiError } from "@/lib/api/client";
import type {
  ApiCategory,
  ApiOrganizationFull,
  ApiProduct,
  ApiUom,
  ProdType,
} from "@/lib/api/types";

export const Route = createFileRoute("/products/$productId")({
  head: () => ({ meta: [{ title: "Product — Agribridge" }] }),
  component: ProductDetail,
});

const PROD_TYPE_LABELS: Record<ProdType, string> = {
  produce: "Produce",
  input: "Input",
  service: "Service",
};

function lookupCategory(categories: ApiCategory[], id: number): string {
  const found = categories.find((c) => c.id === id);
  if (found) {
    return found.is_leaf ? found.name : `${found.name} (parent)`;
  }
  return `#${id}`;
}

function ProductDetail() {
  const { productId } = Route.useParams();
  const categoriesList = useApiList(() => listCategoriesApi({ page_size: 200 }), []);
  const uomsList = useApiList(() => listUomsApi({ page_size: 100 }), []);
  const organizationsList = useApiList(() => listOrganizationsApi({ page_size: 100 }), []);
  const categories = categoriesList.items;
  const uoms = uomsList.items;
  const organizations = organizationsList.items;

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const id = /^\d+$/.test(productId) ? Number(productId) : null;

  const load = () => {
    if (id === null) return Promise.resolve();
    setLoading(true);
    setError("");
    return getProductApi(id)
      .then(setProduct)
      .catch((err: unknown) => {
        setProduct(null);
        setError(
          err instanceof ApiError
            ? (apiErrorMessage(err.body) ?? err.message)
            : "Could not reach the server.",
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (id === null) {
    return (
      <AppShell title="Product not found">
        <BackLink />
        <div className="surface-card p-10 text-center text-sm text-muted-foreground">
          This isn't a valid product id.
        </div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell title="Product">
        <div className="surface-card flex items-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading product…
        </div>
      </AppShell>
    );
  }

  if (!product) {
    return (
      <AppShell title="Product not found">
        <BackLink />
        <div className="surface-card flex flex-wrap items-center gap-3 p-10 text-sm text-destructive">
          <span className="min-w-0 flex-1">{error || "This product doesn't exist."}</span>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Retry
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={product.name}
      description={`${product.sku} · ${PROD_TYPE_LABELS[product.prod_type]}`}
    >
      <BackLink />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DetailCard
            title="Catalog info"
            fields={[
              { label: "SKU", value: product.sku },
              { label: "Slug", value: product.slug },
              { label: "Product type", value: PROD_TYPE_LABELS[product.prod_type] },
              { label: "Category", value: lookupCategory(categories, product.category) },
              {
                label: "Default unit",
                value:
                  uoms.find((u) => u.id === product.default_uom)?.name ?? `#${product.default_uom}`,
              },
              {
                label: "Brand / org",
                value: product.brand_org
                  ? (organizations.find((o) => o.id === product.brand_org)?.name ??
                    `#${product.brand_org}`)
                  : "—",
              },
              {
                label: "Shelf life",
                value: product.shelf_life_days != null ? `${product.shelf_life_days} days` : "—",
              },
              { label: "Created", value: new Date(product.created_at).toLocaleDateString() },
            ]}
          />
        </div>

        <div className="space-y-6">
          <section className="surface-card p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
                {(product.name || "?")
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-foreground">{product.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="secondary">{PROD_TYPE_LABELS[product.prod_type]}</Badge>
                  <Badge variant={product.is_active ? "outline" : "destructive"}>
                    {product.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {product.storage_notes || "No storage notes on record."}
            </p>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Availability</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium text-foreground">
                  {product.is_active ? "Active" : "Inactive"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Shelf life</dt>
                <dd className="font-medium text-foreground">
                  {product.shelf_life_days != null ? `${product.shelf_life_days} days` : "—"}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  patchProductApi(product.id, { is_active: !product.is_active })
                    .then((res) => setProduct(res as ApiProduct))
                    .finally(() => setBusy(false));
                }}
              >
                {product.is_active ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function BackLink() {
  return (
    <div className="mt-4 mb-2">
      <Link to="/products" className="text-sm text-muted-foreground hover:underline">
        ← All products
      </Link>
    </div>
  );
}

function DetailCard({
  title,
  fields,
}: {
  title: string;
  fields: Array<{ label: string; value: string }>;
}) {
  return (
    <section className="surface-card p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label}>
            <dt className="text-muted-foreground">{f.label}</dt>
            <dd className="font-medium break-words text-foreground">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
