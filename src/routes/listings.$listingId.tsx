import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Pencil, RefreshCw, ShieldCheck, Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { StatCard } from "@/components/stat-card";
import { useApiList } from "@/hooks/use-api-list";
import { apiErrorMessage, apiFieldErrors, ApiError, resolveMediaUrl } from "@/lib/api/client";
import { getStoredApiUser } from "@/lib/api/auth";
import {
  deleteListingApi,
  getListingApi,
  listListingPhotosApi,
  patchListingApi,
  createListingPhotoApi,
  deleteListingPhotoApi,
} from "@/lib/api/listings";
import { listProductsApi, listVariantsApi } from "@/lib/api/products";
import { listLocationsApi, listUomsApi } from "@/lib/api/reference";
import { listOrganizationsApi } from "@/lib/api/organizations";
import type {
  ApiListing,
  ApiListingPhoto,
  ApiProduct,
  ApiUom,
  ApiVariant,
  ListingStatus,
  ListingScope,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/listings/$listingId")({
  head: () => ({ meta: [{ title: "Listing — Agribridge" }] }),
  component: ListingDetail,
});

const LISTING_STATUS_META: Record<ListingStatus, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-success/12 text-success" },
  reserved: { label: "Reserved", className: "bg-warning/20 text-warning-foreground" },
  sold: { label: "Sold", className: "bg-primary-soft text-primary" },
  expired: { label: "Expired", className: "bg-muted text-muted-foreground" },
};

function ListingStatusBadge({ status }: { status: ListingStatus }) {
  const meta = LISTING_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        meta.className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function ListingDetail() {
  const { listingId } = Route.useParams();
  const id = /^\d+$/.test(listingId) ? Number(listingId) : null;
  const navigate = useNavigate();

  const productsList = useApiList(() => listProductsApi({ is_active: true, page_size: 100 }), []);
  const variantsList = useApiList(() => listVariantsApi({ is_active: true, page_size: 300 }), []);
  const uomsList = useApiList(() => listUomsApi({ page_size: 100 }), []);
  const locationsList = useApiList(() => listLocationsApi({ page_size: 300 }), []);
  const orgsList = useApiList(() => listOrganizationsApi({ page_size: 100 }), []);

  const productById = new Map(productsList.items.map((p) => [p.id, p] as const));
  const variantById = new Map(variantsList.items.map((v) => [v.id, v] as const));
  const uomById = new Map(uomsList.items.map((u) => [u.id, u] as const));
  const locationById = new Map(locationsList.items.map((l) => [l.id, l.name] as const));
  const orgById = new Map(orgsList.items.map((o) => [o.id, o] as const));

  const [listing, setListing] = useState<ApiListing | null>(null);
  const [photos, setPhotos] = useState<ApiListingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [statusBusy, setStatusBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editNegotiable, setEditNegotiable] = useState(false);
  const [editUnitPrice, setEditUnitPrice] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editHarvestDate, setEditHarvestDate] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editScope, setEditScope] = useState<ListingScope>("commercial");
  const [editError, setEditError] = useState("");
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
  const [editBusy, setEditBusy] = useState(false);

  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const apiUser = getStoredApiUser();

  const loadListing = () => {
    if (id === null) return Promise.resolve();
    setLoading(true);
    setError("");
    return Promise.all([getListingApi(id), listListingPhotosApi({ listing: id, page_size: 100 })])
      .then(([l, photosPage]) => {
        setListing(l);
        setPhotos(photosPage.results);
      })
      .catch((err: unknown) => {
        setListing(null);
        setPhotos([]);
        setError(
          err instanceof ApiError
            ? (apiErrorMessage(err.body) ?? err.message)
            : "Could not reach the server.",
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void loadListing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (id === null) {
    return (
      <AppShell title="Listing not found">
        <div className="surface-card p-10 text-center text-sm text-muted-foreground">
          This isn't a valid listing id.
        </div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell title="Listing">
        <div className="surface-card flex items-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading listing…
        </div>
      </AppShell>
    );
  }

  if (!listing) {
    return (
      <AppShell title="Listing not found">
        <div className="surface-card flex flex-wrap items-center gap-3 p-10 text-sm text-destructive">
          <span className="min-w-0 flex-1">{error || "This listing doesn't exist."}</span>
          <Button size="sm" variant="outline" onClick={() => void loadListing()}>
            <RefreshCw className="size-4" /> Retry
          </Button>
        </div>
      </AppShell>
    );
  }

  const isOwner = Boolean(apiUser && listing.seller_user === apiUser.id);
  const isStaff = apiUser?.roles === "superadmin";
  const canManage = isOwner || isStaff;

  const variant = variantById.get(listing.variant);
  const product = variant ? productById.get(variant.product) : undefined;
  const uom = uomById.get(listing.uom);
  const locationName = locationById.get(listing.location) ?? `Location #${listing.location}`;
  const price = listing.unit_price != null ? Number(listing.unit_price) : null;
  const qty = Number(listing.qty_available);
  const sellerLabel =
    listing.seller_user != null
      ? apiUser && apiUser.id === listing.seller_user
        ? "You"
        : `User #${listing.seller_user}`
      : (orgById.get(listing.seller_org ?? 0)?.name ?? `Org #${listing.seller_org}`);

  const LISTING_STATUS_OPTIONS: ListingStatus[] = ["available", "reserved", "sold", "expired"];

  const openEdit = () => {
    setEditNegotiable(listing.negotiable);
    setEditUnitPrice(listing.unit_price ?? "");
    setEditQty(listing.qty_available);
    setEditHarvestDate(listing.harvest_date);
    setEditGrade(listing.grade);
    setEditScope(listing.scope);
    setEditError("");
    setEditFieldErrors({});
    setEditOpen(true);
  };

  const submitEdit = async () => {
    setEditBusy(true);
    setEditError("");
    setEditFieldErrors({});
    try {
      const updated = await patchListingApi(listing.id, {
        negotiable: editNegotiable,
        unit_price: editNegotiable ? null : editUnitPrice || null,
        qty_available: editQty,
        harvest_date: editHarvestDate,
        grade: editGrade,
        scope: editScope,
      });
      setListing(updated);
      setEditOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setEditError(apiErrorMessage(err.body) ?? err.message);
        setEditFieldErrors(apiFieldErrors(err.body));
      } else {
        setEditError("Could not reach the server.");
      }
    } finally {
      setEditBusy(false);
    }
  };

  const handleDelete = async () => {
    setDeleteBusy(true);
    try {
      await deleteListingApi(listing.id);
      void navigate({ to: "/listings" });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (apiErrorMessage(err.body) ?? err.message)
          : "Could not delete listing.",
      );
      setDeleteBusy(false);
      setConfirmDelete(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadBusy(true);
    setUploadError("");
    try {
      const uploaded = await createListingPhotoApi({ listing: listing.id, photo: file });
      setPhotos((prev) => [...prev, { ...uploaded, created_at: new Date().toISOString() }]);
    } catch (err) {
      setUploadError(
        err instanceof ApiError ? (apiErrorMessage(err.body) ?? err.message) : "Upload failed.",
      );
    } finally {
      setUploadBusy(false);
      e.target.value = "";
    }
  };

  const handlePhotoDelete = async (photoId: number) => {
    try {
      await deleteListingPhotoApi(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (apiErrorMessage(err.body) ?? err.message)
          : "Could not delete photo.",
      );
    }
  };

  return (
    <AppShell
      title={product?.name ?? variant?.name ?? "Listing"}
      description={`Listed by ${sellerLabel} · ${locationName}`}
    >
      <div className="mb-4">
        <Link to="/listings" className="text-sm text-muted-foreground hover:underline">
          ← All listings
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-foreground">
          {product?.name ?? variant?.name ?? "Listing"}
        </h1>
        {variant && <Badge variant="secondary">{variant.name}</Badge>}
        <ListingStatusBadge status={listing.status} />
        {listing.negotiable && <Badge variant="secondary">Negotiable</Badge>}
        {listing.grade && <Badge variant="outline">Grade {listing.grade}</Badge>}
      </div>

      {canManage && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline" onClick={openEdit}>
            <Pencil className="size-4" /> Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4 text-destructive" /> Delete
          </Button>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Available quantity"
          icon={Upload}
          value={`${qty.toLocaleString("en-US")} ${uom?.name ?? ""}`}
          tone="brand"
          hint={`Unit price: ${price != null ? `RWF ${price.toLocaleString("en-US")}` : "Negotiable"}`}
        />
        <StatCard
          title="Scope"
          icon={ShieldCheck}
          value={listing.scope === "peer" ? "Peer-to-peer" : "Commercial"}
          tone="soft"
        />
        <StatCard
          title="Harvested"
          icon={RefreshCw}
          value={formatDate(listing.harvest_date)}
          tone="success"
          hint={listing.grade ? `Grade: ${listing.grade}` : undefined}
        />
        <StatCard
          title="Expires"
          icon={RefreshCw}
          value={formatDate(listing.expires_at)}
          tone={listing.status === "expired" ? "danger" : "warning"}
          hint={`Created ${formatDate(listing.created_at)}`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Listing details</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Product</dt>
                <dd className="font-medium text-foreground">{product?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Variant</dt>
                <dd className="font-medium text-foreground">{variant?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Quantity</dt>
                <dd className="font-medium text-foreground">
                  {qty.toLocaleString("en-US")} {uom?.name}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Unit price</dt>
                <dd className="font-medium text-foreground">
                  {price != null ? `RWF ${price.toLocaleString("en-US")}` : "Negotiable"}
                  {listing.negotiable && price != null && (
                    <span className="text-muted-foreground"> (negotiable)</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Harvest date</dt>
                <dd className="font-medium text-foreground">{formatDate(listing.harvest_date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Grade</dt>
                <dd className="font-medium text-foreground">{listing.grade || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Location</dt>
                <dd className="font-medium text-foreground">{locationName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expires</dt>
                <dd className="font-medium text-foreground">{formatDate(listing.expires_at)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium text-foreground">
                  {formatTimestamp(listing.created_at)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Seller</dt>
                <dd className="font-medium text-foreground">{sellerLabel}</dd>
              </div>
            </dl>
          </section>

          {canManage && !editOpen && (
            <section className="surface-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Manage listing</h2>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Label className="text-xs text-muted-foreground">Update status</Label>
                <Select
                  value={listing.status}
                  disabled={statusBusy}
                  onValueChange={(v) => {
                    setStatusBusy(true);
                    patchListingApi(listing.id, { status: v as ListingStatus })
                      .then((updated) => setListing(updated))
                      .finally(() => setStatusBusy(false));
                  }}
                >
                  <SelectTrigger className="h-9 w-40">
                    <SelectValue />
                    {statusBusy && <Loader2 className="ml-1 size-3 animate-spin" />}
                  </SelectTrigger>
                  <SelectContent>
                    {LISTING_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {LISTING_STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>
          )}

          {canManage && editOpen && (
            <section className="surface-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Edit listing</h2>
              {editError && (
                <div className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {editError}
                </div>
              )}
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="eqty">Quantity ({uom?.name ?? "units"})</Label>
                    <Input
                      id="eqty"
                      type="number"
                      min={0}
                      step="0.001"
                      value={editQty}
                      onChange={(e) => setEditQty(e.target.value)}
                    />
                    {editFieldErrors["qty_available"] && (
                      <p className="text-xs text-destructive">{editFieldErrors["qty_available"]}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="egrade">Grade</Label>
                    <Input
                      id="egrade"
                      value={editGrade}
                      onChange={(e) => setEditGrade(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-foreground">Negotiable price</p>
                  <Switch checked={editNegotiable} onCheckedChange={setEditNegotiable} />
                </div>
                {!editNegotiable && (
                  <div className="grid gap-2">
                    <Label htmlFor="eprice">Unit price (RWF)</Label>
                    <Input
                      id="eprice"
                      type="number"
                      min={0}
                      step="0.01"
                      value={editUnitPrice}
                      onChange={(e) => setEditUnitPrice(e.target.value)}
                    />
                    {editFieldErrors["unit_price"] && (
                      <p className="text-xs text-destructive">{editFieldErrors["unit_price"]}</p>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="eharvest">Harvest date</Label>
                    <Input
                      id="eharvest"
                      type="date"
                      value={editHarvestDate}
                      onChange={(e) => setEditHarvestDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Scope</Label>
                    <Select
                      value={editScope}
                      onValueChange={(v) => setEditScope(v as ListingScope)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="peer">Peer-to-peer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" disabled={editBusy} onClick={() => void submitEdit()}>
                    {editBusy && <Loader2 className="size-4 animate-spin" />}
                    Save changes
                  </Button>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Seller</h2>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {sellerLabel[0]}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{sellerLabel}</p>
                {listing.seller_org != null && (
                  <p className="truncate text-xs text-muted-foreground">Organization</p>
                )}
              </div>
            </div>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Photos ({photos.length})</h2>
            {canManage && (
              <div className="mt-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted">
                  <Upload className="size-3.5" />
                  {uploadBusy ? "Uploading…" : "Upload photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadBusy}
                  />
                </label>
                {uploadError && <p className="mt-2 text-xs text-destructive">{uploadError}</p>}
              </div>
            )}
            {photos.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No photos uploaded yet.</p>
            ) : (
              <ul className="mt-3 grid grid-cols-2 gap-3">
                {photos.map((p) => (
                  <li key={p.id} className="group relative">
                    <img
                      src={resolveMediaUrl(p.photo)}
                      alt={`Photo ${p.id}`}
                      className="aspect-square w-full rounded-lg border border-border object-cover"
                    />
                    {canManage && (
                      <button
                        type="button"
                        className="absolute right-2 top-2 hidden size-6 items-center justify-center rounded-full bg-destructive text-white group-hover:inline-flex"
                        onClick={() => void handlePhotoDelete(p.id)}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Listing summary</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <ListingStatusBadge status={listing.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Scope</dt>
                <dd className="font-medium text-foreground">
                  {listing.scope === "peer" ? "Peer-to-peer" : "Commercial"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Unit</dt>
                <dd className="font-medium text-foreground">
                  {uom?.name ?? `UOM #${listing.uom}`}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-foreground">Delete this listing?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This can't be undone. Buyers will no longer see it.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={deleteBusy}
                onClick={() => void handleDelete()}
              >
                {deleteBusy && <Loader2 className="size-4 animate-spin" />}
                Delete listing
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
