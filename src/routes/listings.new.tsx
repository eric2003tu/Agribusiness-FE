import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoUploader } from "@/components/photo-uploader";
import { getStoredApiUser } from "@/lib/api/auth";
import {
  apiErrorMessage,
  apiFieldErrors,
  ApiError,
  getTokens,
  resolveMediaUrl,
} from "@/lib/api/client";
import { listLocationsApi } from "@/lib/api/reference";
import { listProductsApi, listVariantsApi } from "@/lib/api/products";
import { listUomsApi } from "@/lib/api/reference";
import { listOrganizationsApi } from "@/lib/api/organizations";
import { listUsersApi } from "@/lib/api/users";
import {
  createListingApi,
  createListingPhotoApi,
  type ListingCreatePayload,
} from "@/lib/api/listings";
import { useApiList } from "@/hooks/use-api-list";
import type { ApiListing, ApiListingPhoto, ListingScope } from "@/lib/api/types";

type UploadedPhoto = Omit<ApiListingPhoto, "created_at">;

export const Route = createFileRoute("/listings/new")({
  head: () => ({ meta: [{ title: "New listing — Agribridge" }] }),
  component: NewListingPage,
});

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}

function NewListingPage() {
  const apiUser = getStoredApiUser();
  const hasRealSession = Boolean(apiUser && getTokens());
  const isStaff = apiUser?.roles === "superadmin";

  const productsList = useApiList(() => listProductsApi({ is_active: true, page_size: 100 }), []);
  useEffect(() => {
    if (productsList.hasMore) void productsList.loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsList.hasMore]);
  const uomsList = useApiList(() => listUomsApi({ page_size: 100 }), []);
  const locationsList = useApiList(() => listLocationsApi({ page_size: 100 }), []);
  const staffUsersList = useApiList(
    () =>
      isStaff
        ? listUsersApi({ page_size: 200 })
        : Promise.resolve({ next: null, previous: null, results: [] as never[] }),
    [isStaff],
  );
  const staffOrgsList = useApiList(
    () =>
      isStaff
        ? listOrganizationsApi({ page_size: 100 })
        : Promise.resolve({ next: null, previous: null, results: [] as never[] }),
    [isStaff],
  );

  const [productId, setProductId] = useState("");
  const variantsList = useApiList(
    () =>
      productId
        ? listVariantsApi({ product: Number(productId), is_active: true, page_size: 100 })
        : Promise.resolve({ next: null, previous: null, results: [] as never[] }),
    [productId],
  );
  useEffect(() => {
    if (variantsList.hasMore) void variantsList.loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantsList.hasMore]);

  const [variantId, setVariantId] = useState("");
  const [qtyAvailable, setQtyAvailable] = useState("");
  const [uomId, setUomId] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [unitPrice, setUnitPrice] = useState("");
  const [locationId, setLocationId] = useState("");
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().slice(0, 10));
  const [grade, setGrade] = useState("");
  const [scope, setScope] = useState<ListingScope>("commercial");
  const [sellerMode, setSellerMode] = useState<"me" | "user" | "org">("me");
  const [sellerUserId, setSellerUserId] = useState("");
  const [sellerOrgId, setSellerOrgId] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<ApiListing | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [photoWarning, setPhotoWarning] = useState("");

  const selectedProduct = productsList.items.find((p) => String(p.id) === productId);

  function resetForm() {
    setProductId("");
    setVariantId("");
    setQtyAvailable("");
    setUomId("");
    setNegotiable(false);
    setUnitPrice("");
    setLocationId("");
    setHarvestDate(new Date().toISOString().slice(0, 10));
    setGrade("");
    setScope("commercial");
    setSellerMode("me");
    setSellerUserId("");
    setSellerOrgId("");
    setPhotos([]);
    setFormError("");
    setFieldErrors({});
    setCreated(null);
    setUploadedPhotos([]);
    setPhotoWarning("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!apiUser) return;
    const nextErrors: Record<string, string> = {};
    if (!variantId) nextErrors["variant"] = "Pick a product variant.";
    if (!qtyAvailable.trim()) nextErrors["qty_available"] = "Enter the quantity available.";
    if (!uomId) nextErrors["uom"] = "Pick a unit of measure.";
    if (!locationId) nextErrors["location"] = "Pick a location.";
    if (!harvestDate) nextErrors["harvest_date"] = "Enter the harvest date.";
    if (sellerMode === "user" && !sellerUserId) nextErrors["seller_user"] = "Pick the seller user.";
    if (sellerMode === "org" && !sellerOrgId)
      nextErrors["seller_org"] = "Pick the seller organization.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    setPhotoWarning("");
    const payload: ListingCreatePayload = {
      ...(sellerMode === "org" && sellerOrgId
        ? { seller_org: Number(sellerOrgId) }
        : sellerMode === "user" && sellerUserId
          ? { seller_user: Number(sellerUserId) }
          : { seller_user: apiUser.id }),
      variant: Number(variantId),
      qty_available: qtyAvailable.trim(),
      uom: Number(uomId),
      location: Number(locationId),
      harvest_date: harvestDate,
      negotiable,
      scope,
      status: "available",
      ...(negotiable ? {} : unitPrice.trim() ? { unit_price: unitPrice.trim() } : {}),
      ...(grade.trim() ? { grade: grade.trim() } : {}),
    };
    try {
      const listing = await createListingApi(payload);
      setCreated(listing);

      if (photos.length > 0) {
        const uploadFailures: string[] = [];
        const succeeded: UploadedPhoto[] = [];
        for (let i = 0; i < photos.length; i++) {
          try {
            const file = await dataUrlToFile(
              photos[i] as string,
              `listing-${listing.id}-photo-${i + 1}.jpg`,
            );
            const uploaded = await createListingPhotoApi({ listing: listing.id, photo: file });
            succeeded.push(uploaded);
          } catch {
            uploadFailures.push(String(i + 1));
          }
        }
        setUploadedPhotos(succeeded);
        if (uploadFailures.length > 0) {
          setPhotoWarning(
            `${succeeded.length} of ${photos.length} photo(s) uploaded — photo(s) ${uploadFailures.join(", ")} failed.`,
          );
        }
      }
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  if (!hasRealSession) {
    return (
      <AppShell
        title="New produce listing"
        description="List your harvest on the live marketplace."
      >
        <div className="surface-card mx-auto max-w-md space-y-3 p-6 text-center">
          <AlertTriangle className="mx-auto size-8 text-amber-500" />
          <h2 className="text-sm font-semibold text-foreground">Sign in with a real account</h2>
          <p className="text-sm text-muted-foreground">
            Creating a live listing writes to the real AgriBridge API, so it needs a real signed-in
            account — not the mock demo-account switcher. Sign in (or register) with a real phone
            number and password first.
          </p>
          <Button asChild>
            <Link to="/login">Go to sign in</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (created) {
    return (
      <AppShell
        title="New produce listing"
        description="List your harvest on the live marketplace."
      >
        <div className="surface-card mx-auto max-w-lg space-y-4 p-6">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="size-6" />
            <h2 className="text-sm font-semibold">Listing published</h2>
          </div>
          {photoWarning && <p className="text-sm text-amber-600">{photoWarning}</p>}
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Listing ID</dt>
              <dd className="font-medium text-foreground">#{created.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Quantity</dt>
              <dd className="font-medium text-foreground">{created.qty_available}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Price</dt>
              <dd className="font-medium text-foreground">
                {created.negotiable ? "Negotiable" : (created.unit_price ?? "—")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Harvest date</dt>
              <dd className="font-medium text-foreground">{created.harvest_date}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium text-foreground">{created.status}</dd>
            </div>
          </dl>

          {uploadedPhotos.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Uploaded photos ({uploadedPhotos.length})
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {uploadedPhotos.map((p) => (
                  <img
                    key={p.id}
                    src={resolveMediaUrl(p.photo)}
                    alt={`Listing ${created.id} photo ${p.id}`}
                    className="aspect-square w-full rounded-lg border border-border object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            This was saved to the live AgriBridge API. There's no public "browse real listings" page
            yet — this confirmation is the only place it's shown right now.
          </p>
          <div className="flex gap-2">
            <Button onClick={resetForm}>List another</Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const noProducts = !productsList.loading && productsList.items.length === 0;
  const noLocations = !locationsList.loading && locationsList.items.length === 0;

  return (
    <AppShell
      title="New produce listing"
      description="List your harvest on the live AgriBridge marketplace."
    >
      {(noProducts || noLocations) && (
        <div className="surface-card mb-6 flex items-start gap-3 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            {noProducts && "The live catalog has no products yet. "}
            {noLocations && "The live location tree has no entries yet. "}
            Add them via the admin{" "}
            <Link to="/catalog-data" className="underline">
              Catalog
            </Link>{" "}
            /{" "}
            <Link to="/reference-data" className="underline">
              Reference data
            </Link>{" "}
            pages before this form has anything to select.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <form
          className="surface-card space-y-5 p-6 lg:col-span-2"
          onSubmit={(e) => {
            void submit(e);
          }}
        >
          {formError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          {isStaff && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Selling as</p>
                <p className="text-xs text-muted-foreground">
                  Staff can publish listings on behalf of any user or organization.
                </p>
              </div>
              <Select
                value={sellerMode}
                onValueChange={(v) => setSellerMode(v as "me" | "user" | "org")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="me">Myself (User #{apiUser?.id})</SelectItem>
                  <SelectItem value="user">A specific user</SelectItem>
                  <SelectItem value="org">An organization</SelectItem>
                </SelectContent>
              </Select>
              {sellerMode === "user" && (
                <div className="grid gap-2">
                  <Label>Seller user</Label>
                  <Select value={sellerUserId} onValueChange={setSellerUserId}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={staffUsersList.items.length ? "Select user" : "No users found"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {staffUsersList.items.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.full_name} · #{u.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors["seller_user"] && (
                    <p className="text-xs text-destructive">{fieldErrors["seller_user"]}</p>
                  )}
                </div>
              )}
              {sellerMode === "org" && (
                <div className="grid gap-2">
                  <Label>Seller organization</Label>
                  <Select value={sellerOrgId} onValueChange={setSellerOrgId}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          staffOrgsList.items.length
                            ? "Select organization"
                            : "No organizations found"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {staffOrgsList.items.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors["seller_org"] && (
                    <p className="text-xs text-destructive">{fieldErrors["seller_org"]}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label>Product</Label>
            <Select
              value={productId}
              onValueChange={(v) => {
                setProductId(v);
                setVariantId("");
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={productsList.items.length ? "Select a product" : "No products yet"}
                />
              </SelectTrigger>
              <SelectContent>
                {productsList.items.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Variant</Label>
              <Select value={variantId} onValueChange={setVariantId} disabled={!productId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !productId
                        ? "Pick a product first"
                        : variantsList.items.length
                          ? "Select a variant"
                          : "No variants yet"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {variantsList.items.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors["variant"] && (
                <p className="text-xs text-destructive">{fieldErrors["variant"]}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Unit of measure</Label>
              <Select value={uomId} onValueChange={setUomId}>
                <SelectTrigger>
                  <SelectValue placeholder={uomsList.items.length ? "Select" : "None yet"} />
                </SelectTrigger>
                <SelectContent>
                  {uomsList.items.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name} ({u.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors["uom"] && (
                <p className="text-xs text-destructive">{fieldErrors["uom"]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity available</Label>
              <Input
                id="quantity"
                type="number"
                min={0}
                step="0.001"
                value={qtyAvailable}
                onChange={(e) => setQtyAvailable(e.target.value)}
                required
              />
              {fieldErrors["qty_available"] && (
                <p className="text-xs text-destructive">{fieldErrors["qty_available"]}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={locationsList.items.length ? "Select a location" : "None yet"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {locationsList.items.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors["location"] && (
                <p className="text-xs text-destructive">{fieldErrors["location"]}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Negotiable price</p>
              <p className="text-xs text-muted-foreground">Let buyers propose their own price.</p>
            </div>
            <Switch checked={negotiable} onCheckedChange={setNegotiable} />
          </div>

          {!negotiable && (
            <div className="grid gap-2">
              <Label htmlFor="price">Unit price</Label>
              <Input
                id="price"
                type="number"
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="harvest">Harvest date</Label>
              <Input
                id="harvest"
                type="date"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="grade">Quality grade (optional)</Label>
              <Input
                id="grade"
                placeholder="Grade A"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Listing scope</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as ListingScope)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commercial">Commercial — open to any buyer</SelectItem>
                <SelectItem value="peer">Peer-to-peer — nearby farmers only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Product photos (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Uploaded to the live API as separate listing photos once the listing is created.
            </p>
            <PhotoUploader photos={photos} onChange={setPhotos} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Publish listing
            </Button>
          </div>
        </form>

        <div className="space-y-6">
          <section className="surface-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Preview
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {selectedProduct?.name ?? "Product"}
            </p>
            <p className="text-sm text-muted-foreground">
              Listed by{" "}
              {!apiUser
                ? "—"
                : sellerMode === "org"
                  ? (staffOrgsList.items.find((o) => String(o.id) === sellerOrgId)?.name ??
                    "Organization")
                  : sellerMode === "user"
                    ? (staffUsersList.items.find((u) => String(u.id) === sellerUserId)?.full_name ??
                      "User")
                    : apiUser.full_name}
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Quantity</dt>
                <dd className="font-medium text-foreground">{qtyAvailable || "—"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Price</dt>
                <dd className="font-medium text-foreground">
                  {negotiable ? "Negotiable" : unitPrice ? unitPrice : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Harvest date</dt>
                <dd className="font-medium text-foreground">{harvestDate}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Scope</dt>
                <dd className="font-medium text-foreground">
                  {scope === "peer" ? "Peer-to-peer" : "Commercial"}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
