import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StaffAccessNotice } from "@/components/staff-access-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/data-table";
import { useApiList } from "@/hooks/use-api-list";
import { apiErrorMessage, apiFieldErrors, ApiError } from "@/lib/api/client";
import { listCurrenciesApi } from "@/lib/api/reference";
import { listOrganizationsApi } from "@/lib/api/organizations";
import { listUsersApi } from "@/lib/api/users";
import { listListingsApi, listSourcingRequestsApi } from "@/lib/api/listings";
import { listVariantsApi } from "@/lib/api/products";
import {
  createCartApi,
  createCartItemApi,
  deleteCartApi,
  deleteCartItemApi,
  listCartItemsApi,
  listCartsApi,
  patchCartApi,
  patchCartItemApi,
  type CartCreatePayload,
  type CartItemWritePayload,
} from "@/lib/api/carts";
import {
  createAggGroupApi,
  createAggPartApi,
  createGrpPledgeApi,
  createGrpPurchaseApi,
  deleteAggGroupApi,
  deleteAggPartApi,
  deleteGrpPledgeApi,
  deleteGrpPurchaseApi,
  listAggGroupsApi,
  listAggPartsApi,
  listGrpPledgesApi,
  listGrpPurchasesApi,
  patchAggGroupApi,
  patchAggPartApi,
  patchGrpPledgeApi,
  patchGrpPurchaseApi,
  type AggGroupPayload,
  type AggPartPayload,
  type GrpPledgePayload,
  type GrpPurchaseCreatePayload,
} from "@/lib/api/aggregation";
import type {
  AggGroupStatus,
  AggPartStatus,
  ApiAggGroup,
  ApiAggPart,
  ApiCart,
  ApiCartItem,
  ApiCurrency,
  ApiGrpPledge,
  ApiGrpPurchase,
  ApiListing,
  ApiOrganizationFull,
  ApiSourcingRequest,
  ApiUser,
  ApiVariant,
  GrpPledgeStatus,
  GrpPurchaseStatus,
} from "@/lib/api/types";

export const Route = createFileRoute("/commerce-data")({
  head: () => ({
    meta: [
      { title: "Commerce — Agribridge" },
      { name: "description", content: "Manage carts and pooled/aggregation buying on the live API." },
    ],
  }),
  component: CommerceDataPage,
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
}: {
  users: ApiUser[];
  organizations: ApiOrganizationFull[];
  ownerKind: OwnerKind;
  setOwnerKind: (k: OwnerKind) => void;
  ownerId: string;
  setOwnerId: (id: string) => void;
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label>Owner type</Label>
        <Select
          value={ownerKind}
          onValueChange={(v) => {
            setOwnerKind(v as OwnerKind);
            setOwnerId("");
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="organization">Organization</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>{ownerKind === "user" ? "User" : "Organization"}</Label>
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

/* --------------------------------- Carts -------------------------------- */

function CartsTab({
  users,
  organizations,
  currencies,
  onOpenItems,
}: {
  users: ApiUser[];
  organizations: ApiOrganizationFull[];
  currencies: ApiCurrency[];
  onOpenItems: (cart: ApiCart) => void;
}) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listCartsApi({ page_size: 50 }), []);
  const [ownerKind, setOwnerKind] = useState<OwnerKind>("user");
  const [ownerId, setOwnerId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setOwnerKind("user");
    setOwnerId("");
    setCurrencyId("");
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerId || !currencyId) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    const payload: CartCreatePayload = {
      ...(ownerKind === "user" ? { buyer_user: Number(ownerId) } : { buyer_org: Number(ownerId) }),
      currency: Number(currencyId),
    };
    try {
      await createCartApi(payload);
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
      await deleteCartApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  function ownerLabel(c: ApiCart) {
    if (c.buyer_user) return users.find((u) => u.id === c.buyer_user)?.full_name ?? `User #${c.buyer_user}`;
    if (c.buyer_org) return organizations.find((o) => o.id === c.buyer_org)?.name ?? `Org #${c.buyer_org}`;
    return "—";
  }

  const columns: Column<ApiCart>[] = [
    { key: "owner", header: "Owner", render: ownerLabel, exportValue: ownerLabel },
    {
      key: "currency",
      header: "Currency",
      render: (c) => currencies.find((cur) => cur.id === c.currency)?.code ?? `#${c.currency}`,
      exportValue: (c) => currencies.find((cur) => cur.id === c.currency)?.code ?? "",
    },
    { key: "created", header: "Created", render: (c) => new Date(c.created_at).toLocaleString(), exportValue: (c) => c.created_at },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => onOpenItems(c)}>
            Items
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(c.id)}>
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Create a cart</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <OwnerPicker
            users={users}
            organizations={organizations}
            ownerKind={ownerKind}
            setOwnerKind={setOwnerKind}
            ownerId={ownerId}
            setOwnerId={setOwnerId}
          />
          <div className="grid gap-2">
            <Label>Currency</Label>
            <Select value={currencyId} onValueChange={setCurrencyId}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={currencies.length ? "Select" : "None yet"} />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors["currency"] && <p className="text-xs text-destructive">{fieldErrors["currency"]}</p>}
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create
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
            getRowId={(c) => String(c.id)}
            searchFields={ownerLabel}
            exportFileName="carts"
            paginate
            searchPlaceholder="Search by owner…"
            emptyMessage="No carts yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

function CartItemsPanel({ cart, variants, listings }: { cart: ApiCart; variants: ApiVariant[]; listings: ApiListing[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(
    () => listCartItemsApi({ cart: cart.id, page_size: 100 }),
    [cart.id],
  );
  const [variantId, setVariantId] = useState("");
  const [listingId, setListingId] = useState("none");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setVariantId("");
    setListingId("none");
    setQuantity("");
    setUnitPrice("");
    setEditingId(null);
    setFormError("");
  }
  function startEdit(ci: ApiCartItem) {
    setEditingId(ci.id);
    setVariantId(String(ci.variant));
    setListingId(ci.listing ? String(ci.listing) : "none");
    setQuantity(ci.quantity);
    setUnitPrice(ci.unit_price);
    setFormError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!variantId || !quantity.trim() || !unitPrice.trim()) return;
    setBusy(true);
    setFormError("");
    const payload: CartItemWritePayload = {
      cart: cart.id,
      variant: Number(variantId),
      quantity: quantity.trim(),
      unit_price: unitPrice.trim(),
      ...(listingId === "none" ? {} : { listing: Number(listingId) }),
    };
    try {
      if (editingId) await patchCartItemApi(editingId, payload);
      else await createCartItemApi(payload);
      resetForm();
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not reach the server.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteCartItemApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiCartItem>[] = [
    {
      key: "variant",
      header: "Variant",
      render: (ci) => variants.find((v) => v.id === ci.variant)?.name ?? `#${ci.variant}`,
      exportValue: (ci) => variants.find((v) => v.id === ci.variant)?.name ?? "",
    },
    { key: "qty", header: "Quantity", render: (ci) => ci.quantity, exportValue: (ci) => ci.quantity },
    { key: "price", header: "Unit price", render: (ci) => ci.unit_price, exportValue: (ci) => ci.unit_price },
    {
      key: "actions",
      header: "",
      render: (ci) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(ci)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(ci.id)}>
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h3 className="text-sm font-semibold text-foreground">{editingId ? "Edit item" : "Add an item"}</h3>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Variant</Label>
            <Select value={variantId} onValueChange={setVariantId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={variants.length ? "Select a variant" : "No variants yet"} />
              </SelectTrigger>
              <SelectContent>
                {variants.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Listing (optional)</Label>
            <Select value={listingId} onValueChange={setListingId}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {listings.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    Listing #{l.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Quantity</Label>
            <Input className="w-28" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Unit price</Label>
            <Input className="w-28" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
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
            getRowId={(ci) => String(ci.id)}
            searchFields={(ci) => variants.find((v) => v.id === ci.variant)?.name ?? ""}
            exportFileName="cart-items"
            paginate
            searchPlaceholder="Search by variant…"
            emptyMessage="No items in this cart yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

function CartsAndItemsTab({
  users,
  organizations,
  currencies,
  variants,
  listings,
}: {
  users: ApiUser[];
  organizations: ApiOrganizationFull[];
  currencies: ApiCurrency[];
  variants: ApiVariant[];
  listings: ApiListing[];
}) {
  const [selectedCart, setSelectedCart] = useState<ApiCart | null>(null);

  if (selectedCart) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="outline" onClick={() => setSelectedCart(null)}>
          ← Back to all carts
        </Button>
        <CartItemsPanel cart={selectedCart} variants={variants} listings={listings} />
      </div>
    );
  }

  return (
    <CartsTab users={users} organizations={organizations} currencies={currencies} onOpenItems={setSelectedCart} />
  );
}

/* --------------------------------- Aggregation groups -------------------------------- */

const AGG_GROUP_STATUSES: AggGroupStatus[] = ["proposed", "confirmed", "partially_confirmed", "cancelled"];

function AggGroupsTab({ requests }: { requests: ApiSourcingRequest[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listAggGroupsApi({ page_size: 50 }), []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [requestId, setRequestId] = useState("");
  const [targetQty, setTargetQty] = useState("");
  const [status, setStatus] = useState<AggGroupStatus>("proposed");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setEditingId(null);
    setRequestId("");
    setTargetQty("");
    setStatus("proposed");
    setFormError("");
  }
  function startEdit(g: ApiAggGroup) {
    setEditingId(g.id);
    setRequestId(String(g.request));
    setTargetQty(g.target_qty);
    setStatus(g.status);
    setFormError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!requestId || !targetQty.trim()) return;
    setBusy(true);
    setFormError("");
    const payload: AggGroupPayload = { request: Number(requestId), target_qty: targetQty.trim(), status };
    try {
      if (editingId) await patchAggGroupApi(editingId, payload);
      else await createAggGroupApi(payload);
      resetForm();
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not reach the server.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteAggGroupApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiAggGroup>[] = [
    { key: "request", header: "Request", render: (g) => `#${g.request}`, exportValue: (g) => g.request },
    { key: "target", header: "Target qty", render: (g) => g.target_qty, exportValue: (g) => g.target_qty },
    { key: "confirmed", header: "Confirmed qty", render: (g) => g.confirmed_qty, exportValue: (g) => g.confirmed_qty },
    { key: "status", header: "Status", render: (g) => <Badge variant="secondary">{g.status}</Badge>, exportValue: (g) => g.status },
    {
      key: "actions",
      header: "",
      render: (g) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(g)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(g.id)}>
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit aggregation group" : "Propose an aggregation group"}</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Sourcing request</Label>
            <Select value={requestId} onValueChange={setRequestId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={requests.length ? "Select a request" : "No requests yet"} />
              </SelectTrigger>
              <SelectContent>
                {requests.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    Request #{r.id} ({r.qty_needed})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Target quantity</Label>
            <Input className="w-32" value={targetQty} onChange={(e) => setTargetQty(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AggGroupStatus)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGG_GROUP_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
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
            getRowId={(g) => String(g.id)}
            searchFields={(g) => `${g.request} ${g.status}`}
            exportFileName="aggregation-groups"
            paginate
            searchPlaceholder="Search…"
            emptyMessage="No aggregation groups yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* ----------------------------- Aggregation participants ----------------------------- */

const AGG_PART_STATUSES: AggPartStatus[] = ["proposed", "accepted", "declined", "withdrawn"];

function AggPartsTab({ groups, listings }: { groups: ApiAggGroup[]; listings: ApiListing[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listAggPartsApi({ page_size: 50 }), []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [groupId, setGroupId] = useState("");
  const [listingId, setListingId] = useState("");
  const [allocQty, setAllocQty] = useState("");
  const [agreedPrice, setAgreedPrice] = useState("");
  const [status, setStatus] = useState<AggPartStatus>("proposed");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setEditingId(null);
    setGroupId("");
    setListingId("");
    setAllocQty("");
    setAgreedPrice("");
    setStatus("proposed");
    setFormError("");
  }
  function startEdit(p: ApiAggPart) {
    setEditingId(p.id);
    setGroupId(String(p.group));
    setListingId(String(p.listing));
    setAllocQty(p.alloc_qty);
    setAgreedPrice(p.agreed_price);
    setStatus(p.status);
    setFormError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId || !listingId || !allocQty.trim() || !agreedPrice.trim()) return;
    setBusy(true);
    setFormError("");
    const payload: AggPartPayload = {
      group: Number(groupId),
      listing: Number(listingId),
      alloc_qty: allocQty.trim(),
      agreed_price: agreedPrice.trim(),
      status,
    };
    try {
      if (editingId) await patchAggPartApi(editingId, payload);
      else await createAggPartApi(payload);
      resetForm();
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not reach the server.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteAggPartApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiAggPart>[] = [
    { key: "group", header: "Group", render: (p) => `#${p.group}`, exportValue: (p) => p.group },
    { key: "listing", header: "Listing", render: (p) => `#${p.listing}`, exportValue: (p) => p.listing },
    { key: "qty", header: "Allocated qty", render: (p) => p.alloc_qty, exportValue: (p) => p.alloc_qty },
    { key: "price", header: "Agreed price", render: (p) => p.agreed_price, exportValue: (p) => p.agreed_price },
    { key: "status", header: "Status", render: (p) => <Badge variant="secondary">{p.status}</Badge>, exportValue: (p) => p.status },
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
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit participant" : "Add a participant"}</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Group</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={groups.length ? "Select a group" : "No groups yet"} />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    Group #{g.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Listing</Label>
            <Select value={listingId} onValueChange={setListingId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={listings.length ? "Select a listing" : "No listings yet"} />
              </SelectTrigger>
              <SelectContent>
                {listings.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    Listing #{l.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Allocated qty</Label>
            <Input className="w-28" value={allocQty} onChange={(e) => setAllocQty(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Agreed price</Label>
            <Input className="w-28" value={agreedPrice} onChange={(e) => setAgreedPrice(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AggPartStatus)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGG_PART_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
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
            searchFields={(p) => `${p.group} ${p.listing} ${p.status}`}
            exportFileName="aggregation-participants"
            paginate
            searchPlaceholder="Search…"
            emptyMessage="No participants yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- Group purchases -------------------------------- */

const GRP_PURCHASE_STATUSES: GrpPurchaseStatus[] = ["collecting", "fulfilled", "expired"];

function GrpPurchasesTab({ variants, organizations }: { variants: ApiVariant[]; organizations: ApiOrganizationFull[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(
    () => listGrpPurchasesApi({ page_size: 50 }),
    [],
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [variantId, setVariantId] = useState("");
  const [supplierOrgId, setSupplierOrgId] = useState("");
  const [thresholdQty, setThresholdQty] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<GrpPurchaseStatus>("collecting");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setEditingId(null);
    setVariantId("");
    setSupplierOrgId("");
    setThresholdQty("");
    setDeadline("");
    setStatus("collecting");
    setFormError("");
  }
  function startEdit(g: ApiGrpPurchase) {
    setEditingId(g.id);
    setVariantId(String(g.variant));
    setSupplierOrgId(String(g.supplier_org));
    setThresholdQty(g.threshold_qty);
    setDeadline(g.deadline.slice(0, 16));
    setStatus(g.status);
    setFormError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!variantId || !thresholdQty.trim() || !deadline) return;
    if (!editingId && !supplierOrgId) return;
    setBusy(true);
    setFormError("");
    const deadlineIso = new Date(deadline).toISOString();
    try {
      if (editingId) {
        await patchGrpPurchaseApi(editingId, {
          variant: Number(variantId),
          threshold_qty: thresholdQty.trim(),
          deadline: deadlineIso,
          status,
        });
      } else {
        const payload: GrpPurchaseCreatePayload = {
          variant: Number(variantId),
          supplier_org: Number(supplierOrgId),
          threshold_qty: thresholdQty.trim(),
          deadline: deadlineIso,
          status,
        };
        await createGrpPurchaseApi(payload);
      }
      resetForm();
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not reach the server.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteGrpPurchaseApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiGrpPurchase>[] = [
    {
      key: "variant",
      header: "Variant",
      render: (g) => variants.find((v) => v.id === g.variant)?.name ?? `#${g.variant}`,
      exportValue: (g) => variants.find((v) => v.id === g.variant)?.name ?? "",
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (g) => organizations.find((o) => o.id === g.supplier_org)?.name ?? `#${g.supplier_org}`,
      exportValue: (g) => organizations.find((o) => o.id === g.supplier_org)?.name ?? "",
    },
    { key: "threshold", header: "Threshold", render: (g) => g.threshold_qty, exportValue: (g) => g.threshold_qty },
    { key: "pledged", header: "Pledged", render: (g) => g.pledged_qty, exportValue: (g) => g.pledged_qty },
    { key: "deadline", header: "Deadline", render: (g) => new Date(g.deadline).toLocaleString(), exportValue: (g) => g.deadline },
    { key: "status", header: "Status", render: (g) => <Badge variant="secondary">{g.status}</Badge>, exportValue: (g) => g.status },
    {
      key: "actions",
      header: "",
      render: (g) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(g)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(g.id)}>
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit group purchase" : "Start a group purchase"}</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Variant</Label>
            <Select value={variantId} onValueChange={setVariantId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={variants.length ? "Select a variant" : "No variants yet"} />
              </SelectTrigger>
              <SelectContent>
                {variants.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!editingId && (
            <div className="grid gap-2">
              <Label>Supplier organization</Label>
              <Select value={supplierOrgId} onValueChange={setSupplierOrgId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={organizations.length ? "Select an organization" : "None yet"} />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-2">
            <Label>Threshold qty</Label>
            <Input className="w-28" value={thresholdQty} onChange={(e) => setThresholdQty(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Deadline</Label>
            <Input
              type="datetime-local"
              className="w-52"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as GrpPurchaseStatus)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRP_PURCHASE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
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
            getRowId={(g) => String(g.id)}
            searchFields={(g) => `${g.status}`}
            exportFileName="group-purchases"
            paginate
            searchPlaceholder="Search…"
            emptyMessage="No group purchases yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- Group pledges -------------------------------- */

const GRP_PLEDGE_STATUSES: GrpPledgeStatus[] = ["pledged", "confirmed", "cancelled"];

function GrpPledgesTab({ purchases, users }: { purchases: ApiGrpPurchase[]; users: ApiUser[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listGrpPledgesApi({ page_size: 50 }), []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [purchaseId, setPurchaseId] = useState("");
  const [farmerId, setFarmerId] = useState("");
  const [pledgedQty, setPledgedQty] = useState("");
  const [status, setStatus] = useState<GrpPledgeStatus>("pledged");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setEditingId(null);
    setPurchaseId("");
    setFarmerId("");
    setPledgedQty("");
    setStatus("pledged");
    setFormError("");
  }
  function startEdit(p: ApiGrpPledge) {
    setEditingId(p.id);
    setPurchaseId(String(p.grp_purchase));
    setFarmerId(String(p.farmer_user));
    setPledgedQty(p.pledged_qty);
    setStatus(p.status);
    setFormError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!purchaseId || !farmerId || !pledgedQty.trim()) return;
    setBusy(true);
    setFormError("");
    const payload: GrpPledgePayload = {
      grp_purchase: Number(purchaseId),
      farmer_user: Number(farmerId),
      pledged_qty: pledgedQty.trim(),
      status,
    };
    try {
      if (editingId) await patchGrpPledgeApi(editingId, payload);
      else await createGrpPledgeApi(payload);
      resetForm();
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not reach the server.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteGrpPledgeApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiGrpPledge>[] = [
    { key: "purchase", header: "Group purchase", render: (p) => `#${p.grp_purchase}`, exportValue: (p) => p.grp_purchase },
    {
      key: "farmer",
      header: "Farmer",
      render: (p) => users.find((u) => u.id === p.farmer_user)?.full_name ?? `#${p.farmer_user}`,
      exportValue: (p) => users.find((u) => u.id === p.farmer_user)?.full_name ?? "",
    },
    { key: "qty", header: "Pledged qty", render: (p) => p.pledged_qty, exportValue: (p) => p.pledged_qty },
    { key: "status", header: "Status", render: (p) => <Badge variant="secondary">{p.status}</Badge>, exportValue: (p) => p.status },
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
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit pledge" : "Add a pledge"}</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Group purchase</Label>
            <Select value={purchaseId} onValueChange={setPurchaseId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={purchases.length ? "Select" : "None yet"} />
              </SelectTrigger>
              <SelectContent>
                {purchases.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    Group purchase #{g.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Farmer</Label>
            <Select value={farmerId} onValueChange={setFarmerId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.full_name} ({u.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Pledged qty</Label>
            <Input className="w-28" value={pledgedQty} onChange={(e) => setPledgedQty(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as GrpPledgeStatus)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRP_PLEDGE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
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
            searchFields={(p) => `${p.grp_purchase} ${p.status}`}
            exportFileName="group-pledges"
            paginate
            searchPlaceholder="Search…"
            emptyMessage="No pledges yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* ----------------------------------- Page ----------------------------------- */

function CommerceDataPage() {
  const usersList = useApiList(() => listUsersApi({ page_size: 100 }), []);
  const organizationsList = useApiList(() => listOrganizationsApi({ page_size: 100 }), []);
  const currenciesList = useApiList(() => listCurrenciesApi({ page_size: 100 }), []);
  const variantsList = useApiList(() => listVariantsApi({ page_size: 100 }), []);
  const listingsList = useApiList(() => listListingsApi({ page_size: 100 }), []);
  const requestsList = useApiList(() => listSourcingRequestsApi({ page_size: 100 }), []);
  const aggGroupsList = useApiList(() => listAggGroupsApi({ page_size: 100 }), []);
  const grpPurchasesList = useApiList(() => listGrpPurchasesApi({ page_size: 100 }), []);

  return (
    <AppShell
      title="Commerce"
      description="Manage carts and pooled/aggregation buying on the live API."
    >
      <StaffAccessNotice />
      <Tabs defaultValue="carts">
        <TabsList className="flex-wrap">
          <TabsTrigger value="carts">Carts</TabsTrigger>
          <TabsTrigger value="agg-groups">Aggregation groups</TabsTrigger>
          <TabsTrigger value="agg-parts">Aggregation participants</TabsTrigger>
          <TabsTrigger value="grp-purchases">Group purchases</TabsTrigger>
          <TabsTrigger value="grp-pledges">Group pledges</TabsTrigger>
        </TabsList>

        <TabsContent value="carts">
          <CartsAndItemsTab
            users={usersList.items}
            organizations={organizationsList.items}
            currencies={currenciesList.items}
            variants={variantsList.items}
            listings={listingsList.items}
          />
        </TabsContent>
        <TabsContent value="agg-groups">
          <AggGroupsTab requests={requestsList.items} />
        </TabsContent>
        <TabsContent value="agg-parts">
          <AggPartsTab groups={aggGroupsList.items} listings={listingsList.items} />
        </TabsContent>
        <TabsContent value="grp-purchases">
          <GrpPurchasesTab variants={variantsList.items} organizations={organizationsList.items} />
        </TabsContent>
        <TabsContent value="grp-pledges">
          <GrpPledgesTab purchases={grpPurchasesList.items} users={usersList.items} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
