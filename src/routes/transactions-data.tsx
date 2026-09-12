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
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type Column } from "@/components/data-table";
import { useApiList } from "@/hooks/use-api-list";
import { apiErrorMessage, apiFieldErrors, ApiError } from "@/lib/api/client";
import { listCurrenciesApi } from "@/lib/api/reference";
import { listOrganizationsApi } from "@/lib/api/organizations";
import { listUsersApi } from "@/lib/api/users";
import { listListingsApi } from "@/lib/api/listings";
import { listVariantsApi } from "@/lib/api/products";
import {
  confirmDeliveryBuyerApi,
  confirmDeliverySellerApi,
  createDeliveryApi,
  createOrderApi,
  createOrderLineApi,
  deleteDeliveryApi,
  deleteOrderApi,
  deleteOrderLineApi,
  listDeliveriesApi,
  listOrderLinesApi,
  listOrdersApi,
  patchDeliveryApi,
  patchOrderApi,
  patchOrderLineApi,
  type DeliveryCreatePayload,
  type OrderCreatePayload,
  type OrderLinePayload,
  type OrderUpdatePayload,
} from "@/lib/api/orders";
import {
  createEscrowApi,
  createPayMethodApi,
  createPaymentApi,
  createPayoutApi,
  createPayTxnApi,
  deleteEscrowApi,
  deletePayMethodApi,
  patchPayMethodApi,
  deletePaymentApi,
  deletePayoutApi,
  deletePayTxnApi,
  listEscrowsApi,
  listPayMethodsApi,
  listPaymentsApi,
  listPayoutsApi,
  listPayTxnsApi,
  patchEscrowApi,
  patchPaymentApi,
  patchPayoutApi,
  releaseEscrowApi,
  type EscrowCreatePayload,
  type PaymentCreatePayload,
  type PayoutCreatePayload,
  type PayTxnPayload,
} from "@/lib/api/payments";
import {
  createInvoiceApi,
  createInvoiceLineApi,
  deleteInvoiceApi,
  deleteInvoiceLineApi,
  listInvoiceLinesApi,
  listInvoicesApi,
  patchInvoiceApi,
  patchInvoiceLineApi,
  type InvoiceCreatePayload,
  type InvoiceLinePayload,
} from "@/lib/api/invoicing";
import {
  createDisputeApi,
  createReturnLineApi,
  createReturnRequestApi,
  deleteDisputeApi,
  deleteReturnLineApi,
  deleteReturnRequestApi,
  listDisputesApi,
  listReturnLinesApi,
  listReturnRequestsApi,
  patchDisputeApi,
  patchReturnRequestApi,
  resolveDisputeApi,
  type DisputeCreatePayload,
  type ReturnLinePayload,
  type ReturnRequestCreatePayload,
} from "@/lib/api/disputes";
import type {
  ApiCurrency,
  ApiDelivery,
  ApiDispute,
  ApiEscrow,
  ApiInvoice,
  ApiInvoiceLine,
  ApiListing,
  ApiOrder,
  ApiOrderLine,
  ApiOrganizationFull,
  ApiPayMethod,
  ApiPayment,
  ApiPayout,
  ApiPayTxn,
  ApiReturnLine,
  ApiReturnRequest,
  ApiUser,
  ApiVariant,
  DisputeStatus,
  EscrowStatus,
  InvoiceStatus,
  OrderChannel,
  OrderStatus,
  PaymentStatus,
  PayoutStatus,
  PayTxnType,
  ReturnReason,
  ReturnStatus,
} from "@/lib/api/types";

export const Route = createFileRoute("/transactions-data")({
  head: () => ({
    meta: [
      { title: "Transactions — Agribridge" },
      { name: "description", content: "Manage orders, payments, invoicing and disputes on the live API." },
    ],
  }),
  component: TransactionsDataPage,
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
        <Label>{userLabel} type</Label>
        <Select
          value={ownerKind}
          onValueChange={(v) => {
            setOwnerKind(v as OwnerKind);
            setOwnerId("");
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="organization">Org</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>{ownerKind === "user" ? userLabel : orgLabel}</Label>
        <Select value={ownerId} onValueChange={setOwnerId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select…" />
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

function partyLabel(users: ApiUser[], organizations: ApiOrganizationFull[], userId: number | null, orgId: number | null) {
  if (userId) return users.find((u) => u.id === userId)?.full_name ?? `User #${userId}`;
  if (orgId) return organizations.find((o) => o.id === orgId)?.name ?? `Org #${orgId}`;
  return "—";
}

/* --------------------------------- Orders -------------------------------- */

const ORDER_CHANNELS: OrderChannel[] = ["web", "mobile", "ussd", "aggregation", "group_purchase"];
const ORDER_STATUSES: OrderStatus[] = ["draft", "placed", "confirmed", "in_delivery", "delivered", "completed", "cancelled"];

function OrdersTab({
  users,
  organizations,
  currencies,
  onOpenLines,
  onOpenDelivery,
}: {
  users: ApiUser[];
  organizations: ApiOrganizationFull[];
  currencies: ApiCurrency[];
  onOpenLines: (order: ApiOrder) => void;
  onOpenDelivery: (order: ApiOrder) => void;
}) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listOrdersApi({ page_size: 50 }), []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [buyerKind, setBuyerKind] = useState<OwnerKind>("user");
  const [buyerId, setBuyerId] = useState("");
  const [sellerKind, setSellerKind] = useState<OwnerKind>("user");
  const [sellerId, setSellerId] = useState("");
  const [channel, setChannel] = useState<OrderChannel>("web");
  const [status, setStatus] = useState<OrderStatus>("draft");
  const [currencyId, setCurrencyId] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [grandTotal, setGrandTotal] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setEditingId(null);
    setOrderNumber("");
    setBuyerKind("user");
    setBuyerId("");
    setSellerKind("user");
    setSellerId("");
    setChannel("web");
    setStatus("draft");
    setCurrencyId("");
    setSubtotal("");
    setGrandTotal("");
    setFormError("");
    setFieldErrors({});
  }
  function startEdit(o: ApiOrder) {
    setEditingId(o.id);
    setChannel(o.channel);
    setStatus(o.status);
    setCurrencyId(String(o.currency));
    setSubtotal(o.subtotal);
    setGrandTotal(o.grand_total);
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!currencyId || !subtotal.trim() || !grandTotal.trim()) return;
    if (!editingId && (!orderNumber.trim() || !buyerId || !sellerId)) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    try {
      if (editingId) {
        const payload: OrderUpdatePayload = {
          channel,
          status,
          currency: Number(currencyId),
          subtotal: subtotal.trim(),
          grand_total: grandTotal.trim(),
        };
        await patchOrderApi(editingId, payload);
      } else {
        const payload: OrderCreatePayload = {
          order_number: orderNumber.trim(),
          channel,
          status,
          currency: Number(currencyId),
          subtotal: subtotal.trim(),
          grand_total: grandTotal.trim(),
          ...(buyerKind === "user" ? { buyer_user: Number(buyerId) } : { buyer_org: Number(buyerId) }),
          ...(sellerKind === "user" ? { seller_user: Number(sellerId) } : { seller_org: Number(sellerId) }),
        };
        await createOrderApi(payload);
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
      await deleteOrderApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiOrder>[] = [
    { key: "number", header: "Order #", render: (o) => o.order_number, exportValue: (o) => o.order_number },
    {
      key: "buyer",
      header: "Buyer",
      render: (o) => partyLabel(users, organizations, o.buyer_user, o.buyer_org),
      exportValue: (o) => partyLabel(users, organizations, o.buyer_user, o.buyer_org),
    },
    {
      key: "seller",
      header: "Seller",
      render: (o) => partyLabel(users, organizations, o.seller_user, o.seller_org),
      exportValue: (o) => partyLabel(users, organizations, o.seller_user, o.seller_org),
    },
    { key: "channel", header: "Channel", render: (o) => o.channel, exportValue: (o) => o.channel },
    { key: "status", header: "Status", render: (o) => <Badge variant="secondary">{o.status}</Badge>, exportValue: (o) => o.status },
    { key: "total", header: "Grand total", render: (o) => o.grand_total, exportValue: (o) => o.grand_total },
    {
      key: "actions",
      header: "",
      render: (o) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => onOpenLines(o)}>
            Lines
          </Button>
          <Button size="sm" variant="outline" onClick={() => onOpenDelivery(o)}>
            Delivery
          </Button>
          <Button size="sm" variant="outline" onClick={() => startEdit(o)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(o.id)}>
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
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit order" : "Create an order"}</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          {!editingId && (
            <>
              <div className="grid gap-2">
                <Label>Order number</Label>
                <Input className="w-40" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} required />
                {fieldErrors["order_number"] && <p className="text-xs text-destructive">{fieldErrors["order_number"]}</p>}
              </div>
              <OwnerPicker
                users={users}
                organizations={organizations}
                ownerKind={buyerKind}
                setOwnerKind={setBuyerKind}
                ownerId={buyerId}
                setOwnerId={setBuyerId}
                userLabel="Buyer"
              />
              <OwnerPicker
                users={users}
                organizations={organizations}
                ownerKind={sellerKind}
                setOwnerKind={setSellerKind}
                ownerId={sellerId}
                setOwnerId={setSellerId}
                userLabel="Seller"
              />
            </>
          )}
          <div className="grid gap-2">
            <Label>Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as OrderChannel)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Currency</Label>
            <Select value={currencyId} onValueChange={setCurrencyId}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder={currencies.length ? "Select" : "None"} />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Subtotal</Label>
            <Input className="w-28" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Grand total</Label>
            <Input className="w-28" value={grandTotal} onChange={(e) => setGrandTotal(e.target.value)} required />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Create"}
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
            getRowId={(o) => String(o.id)}
            searchFields={(o) => `${o.order_number} ${o.status} ${o.channel}`}
            exportFileName="orders"
            paginate
            searchPlaceholder="Search by order number, status or channel…"
            emptyMessage="No orders yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

function OrderLinesPanel({ order, variants, listings }: { order: ApiOrder; variants: ApiVariant[]; listings: ApiListing[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(
    () => listOrderLinesApi({ order: order.id, page_size: 100 }),
    [order.id],
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [variantId, setVariantId] = useState("");
  const [listingId, setListingId] = useState("none");
  const [quantity, setQuantity] = useState("");
  const [uomId, setUomId] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [lineSub, setLineSub] = useState("");
  const [lineTotal, setLineTotal] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setEditingId(null);
    setVariantId("");
    setListingId("none");
    setQuantity("");
    setUomId("");
    setUnitPrice("");
    setLineSub("");
    setLineTotal("");
    setFormError("");
  }
  function startEdit(l: ApiOrderLine) {
    setEditingId(l.id);
    setVariantId(String(l.variant));
    setListingId(l.listing ? String(l.listing) : "none");
    setQuantity(l.quantity);
    setUomId(String(l.uom));
    setUnitPrice(l.unit_price);
    setLineSub(l.line_sub);
    setLineTotal(l.line_total);
    setFormError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!variantId || !quantity.trim() || !uomId || !unitPrice.trim() || !lineSub.trim() || !lineTotal.trim()) return;
    setBusy(true);
    setFormError("");
    const payload: OrderLinePayload = {
      order: order.id,
      variant: Number(variantId),
      quantity: quantity.trim(),
      uom: Number(uomId),
      unit_price: unitPrice.trim(),
      line_sub: lineSub.trim(),
      line_total: lineTotal.trim(),
      ...(listingId === "none" ? {} : { listing: Number(listingId) }),
    };
    try {
      if (editingId) await patchOrderLineApi(editingId, payload);
      else await createOrderLineApi(payload);
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
      await deleteOrderLineApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiOrderLine>[] = [
    {
      key: "variant",
      header: "Variant",
      render: (l) => variants.find((v) => v.id === l.variant)?.name ?? `#${l.variant}`,
      exportValue: (l) => variants.find((v) => v.id === l.variant)?.name ?? "",
    },
    { key: "qty", header: "Qty", render: (l) => l.quantity, exportValue: (l) => l.quantity },
    { key: "price", header: "Unit price", render: (l) => l.unit_price, exportValue: (l) => l.unit_price },
    { key: "sub", header: "Line subtotal", render: (l) => l.line_sub, exportValue: (l) => l.line_sub },
    { key: "total", header: "Line total", render: (l) => l.line_total, exportValue: (l) => l.line_total },
    {
      key: "actions",
      header: "",
      render: (l) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(l)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(l.id)}>
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
        <h3 className="text-sm font-semibold text-foreground">
          {editingId ? "Edit line" : "Add a line"} — Order {order.order_number}
        </h3>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Variant</Label>
            <Select value={variantId} onValueChange={setVariantId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Select" />
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
              <SelectTrigger className="w-36">
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
            <Input className="w-24" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>UoM ID</Label>
            <Input className="w-20" value={uomId} onChange={(e) => setUomId(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Unit price</Label>
            <Input className="w-24" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Line subtotal</Label>
            <Input className="w-24" value={lineSub} onChange={(e) => setLineSub(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Line total</Label>
            <Input className="w-24" value={lineTotal} onChange={(e) => setLineTotal(e.target.value)} required />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save" : "Add"}
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
            getRowId={(l) => String(l.id)}
            searchFields={(l) => variants.find((v) => v.id === l.variant)?.name ?? ""}
            exportFileName="order-lines"
            paginate
            searchPlaceholder="Search by variant…"
            emptyMessage="No lines on this order yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

function DeliveryPanel({ order }: { order: ApiOrder }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(
    () => listDeliveriesApi({ order: order.id, page_size: 10 }),
    [order.id],
  );
  const [pickupAddr, setPickupAddr] = useState("");
  const [deliveryAddr, setDeliveryAddr] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    const payload: DeliveryCreatePayload = {
      order: order.id,
      ...(pickupAddr.trim() ? { pickup_addr: Number(pickupAddr) } : {}),
      ...(deliveryAddr.trim() ? { delivery_addr: Number(deliveryAddr) } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    try {
      await createDeliveryApi(payload);
      setPickupAddr("");
      setDeliveryAddr("");
      setNotes("");
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not reach the server.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes(id: number, value: string) {
    try {
      await patchDeliveryApi(id, { notes: value });
      await reload();
    } catch {
      /* no-op */
    }
  }

  async function confirmSeller(id: number) {
    try {
      await confirmDeliverySellerApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Confirm failed.") : "Could not reach the server.");
    }
  }
  async function confirmBuyer(id: number) {
    try {
      await confirmDeliveryBuyerApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Confirm failed.") : "Could not reach the server.");
    }
  }
  async function remove(id: number) {
    try {
      await deleteDeliveryApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  return (
    <div className="space-y-6">
      <ErrorBanner message={formError} />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <section className="surface-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Create delivery — Order {order.order_number}</h3>
          <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={create}>
            <div className="grid gap-2">
              <Label>Pickup address ID</Label>
              <Input className="w-28" value={pickupAddr} onChange={(e) => setPickupAddr(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Delivery address ID</Label>
              <Input className="w-28" value={deliveryAddr} onChange={(e) => setDeliveryAddr(e.target.value)} />
            </div>
            <div className="grid min-w-[16rem] flex-1 gap-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Create delivery
            </Button>
          </form>
        </section>
      ) : (
        items.map((d: ApiDelivery) => (
          <section key={d.id} className="surface-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Delivery #{d.id}</h3>
              <Button size="sm" variant="outline" onClick={() => void remove(d.id)}>
                Delete
              </Button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Seller confirmed: </span>
                {d.seller_confirmed ? new Date(d.seller_confirmed).toLocaleString() : "not yet"}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Buyer confirmed: </span>
                {d.buyer_confirmed ? new Date(d.buyer_confirmed).toLocaleString() : "not yet"}
              </p>
              <p className="text-sm sm:col-span-2">
                <span className="text-muted-foreground">Completed: </span>
                {d.completed_at ? new Date(d.completed_at).toLocaleString() : "not yet"}
              </p>
            </div>
            <Textarea
              className="mt-3"
              defaultValue={d.notes}
              rows={2}
              onBlur={(e) => void saveNotes(d.id, e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" disabled={!!d.seller_confirmed} onClick={() => void confirmSeller(d.id)}>
                Confirm as seller
              </Button>
              <Button size="sm" variant="outline" disabled={!!d.buyer_confirmed} onClick={() => void confirmBuyer(d.id)}>
                Confirm as buyer
              </Button>
            </div>
          </section>
        ))
      )}
      <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
    </div>
  );
}

function OrdersAndDetailTab({
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
  const [detail, setDetail] = useState<{ order: ApiOrder; view: "lines" | "delivery" } | null>(null);

  if (detail) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="outline" onClick={() => setDetail(null)}>
          ← Back to all orders
        </Button>
        {detail.view === "lines" ? (
          <OrderLinesPanel order={detail.order} variants={variants} listings={listings} />
        ) : (
          <DeliveryPanel order={detail.order} />
        )}
      </div>
    );
  }

  return (
    <OrdersTab
      users={users}
      organizations={organizations}
      currencies={currencies}
      onOpenLines={(order) => setDetail({ order, view: "lines" })}
      onOpenDelivery={(order) => setDetail({ order, view: "delivery" })}
    />
  );
}

/* --------------------------------- Payments -------------------------------- */

function PayMethodsTab() {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listPayMethodsApi({}), []);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [provider, setProvider] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setBusy(true);
    setFormError("");
    try {
      await createPayMethodApi({ name: name.trim(), code: code.trim(), ...(provider.trim() ? { provider: provider.trim() } : {}) });
      setName("");
      setCode("");
      setProvider("");
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not reach the server.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(m: ApiPayMethod) {
    try {
      await patchPayMethodApi(m.id, { is_active: !m.is_active });
      await reload();
    } catch {
      /* no-op */
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
    {
      key: "active",
      header: "Active",
      render: (m) => (
        <Button size="sm" variant={m.is_active ? "secondary" : "outline"} onClick={() => void toggleActive(m)}>
          {m.is_active ? "Active" : "Inactive"}
        </Button>
      ),
      exportValue: (m) => (m.is_active ? "yes" : "no"),
    },
    {
      key: "actions",
      header: "",
      render: (m) => (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => void remove(m.id)}>
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
        <h2 className="text-sm font-semibold text-foreground">Add a payment method</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input className="w-40" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Code</Label>
            <Input className="w-28" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Provider</Label>
            <Input className="w-40" value={provider} onChange={(e) => setProvider(e.target.value)} />
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
            getRowId={(m) => String(m.id)}
            searchFields={(m) => `${m.name} ${m.code} ${m.provider}`}
            exportFileName="pay-methods"
            paginate
            searchPlaceholder="Search…"
            emptyMessage="No payment methods yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "authorized", "captured", "failed", "refunded"];

function PaymentsTab({ orders, payMethods }: { orders: ApiOrder[]; payMethods: ApiPayMethod[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listPaymentsApi({ page_size: 50 }), []);
  const [orderId, setOrderId] = useState("");
  const [methodId, setMethodId] = useState("");
  const [amount, setAmount] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId || !methodId || !amount.trim() || !currencyId) return;
    setBusy(true);
    setFormError("");
    const payload: PaymentCreatePayload = {
      order: Number(orderId),
      method: Number(methodId),
      amount: amount.trim(),
      currency: Number(currencyId),
    };
    try {
      await createPaymentApi(payload);
      setOrderId("");
      setMethodId("");
      setAmount("");
      setCurrencyId("");
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not reach the server.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(p: ApiPayment, status: PaymentStatus) {
    try {
      await patchPaymentApi(p.id, { status });
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Update failed.") : "Could not reach the server.");
    }
  }
  async function remove(id: number) {
    try {
      await deletePaymentApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiPayment>[] = [
    {
      key: "order",
      header: "Order",
      render: (p) => orders.find((o) => o.id === p.order)?.order_number ?? `#${p.order}`,
      exportValue: (p) => orders.find((o) => o.id === p.order)?.order_number ?? "",
    },
    {
      key: "method",
      header: "Method",
      render: (p) => payMethods.find((m) => m.id === p.method)?.name ?? `#${p.method}`,
      exportValue: (p) => payMethods.find((m) => m.id === p.method)?.name ?? "",
    },
    { key: "amount", header: "Amount", render: (p) => p.amount, exportValue: (p) => p.amount },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <Select value={p.status} onValueChange={(v) => void setStatus(p, v as PaymentStatus)}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      exportValue: (p) => p.status,
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex justify-end">
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
        <h2 className="text-sm font-semibold text-foreground">Record a payment</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Order</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={orders.length ? "Select" : "None yet"} />
              </SelectTrigger>
              <SelectContent>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.order_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Method</Label>
            <Select value={methodId} onValueChange={setMethodId}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={payMethods.length ? "Select" : "None yet"} />
              </SelectTrigger>
              <SelectContent>
                {payMethods.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Amount</Label>
            <Input className="w-28" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Currency ID</Label>
            <Input className="w-24" value={currencyId} onChange={(e) => setCurrencyId(e.target.value)} required />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Record
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
            getRowId={(p) => String(p.id)}
            searchFields={(p) => p.status}
            exportFileName="payments"
            paginate
            searchPlaceholder="Search by status…"
            emptyMessage="No payments yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

const PAY_TXN_TYPES: PayTxnType[] = ["authorize", "capture", "refund", "void"];

function PayTxnsTab({ payments }: { payments: ApiPayment[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listPayTxnsApi({ page_size: 50 }), []);
  const [paymentId, setPaymentId] = useState("");
  const [txnType, setTxnType] = useState<PayTxnType>("authorize");
  const [providerTxnId, setProviderTxnId] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentId || !providerTxnId.trim()) return;
    setBusy(true);
    setFormError("");
    const payload: PayTxnPayload = { payment: Number(paymentId), txn_type: txnType, provider_txn_id: providerTxnId.trim() };
    try {
      await createPayTxnApi(payload);
      setPaymentId("");
      setProviderTxnId("");
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not reach the server.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deletePayTxnApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiPayTxn>[] = [
    { key: "payment", header: "Payment", render: (t) => `#${t.payment}`, exportValue: (t) => t.payment },
    { key: "type", header: "Type", render: (t) => <Badge variant="secondary">{t.txn_type}</Badge>, exportValue: (t) => t.txn_type },
    { key: "ref", header: "Provider txn id", render: (t) => t.provider_txn_id, exportValue: (t) => t.provider_txn_id },
    { key: "at", header: "Occurred", render: (t) => new Date(t.occurred_at).toLocaleString(), exportValue: (t) => t.occurred_at },
    {
      key: "actions",
      header: "",
      render: (t) => (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => void remove(t.id)}>
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
        <h2 className="text-sm font-semibold text-foreground">Record a provider transaction</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Payment</Label>
            <Select value={paymentId} onValueChange={setPaymentId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={payments.length ? "Select" : "None yet"} />
              </SelectTrigger>
              <SelectContent>
                {payments.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    Payment #{p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={txnType} onValueChange={(v) => setTxnType(v as PayTxnType)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAY_TXN_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Provider txn id</Label>
            <Input className="w-44" value={providerTxnId} onChange={(e) => setProviderTxnId(e.target.value)} required />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Record
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
            getRowId={(t) => String(t.id)}
            searchFields={(t) => `${t.txn_type} ${t.provider_txn_id}`}
            exportFileName="pay-txns"
            paginate
            searchPlaceholder="Search…"
            emptyMessage="No transactions yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

const ESCROW_STATUSES: EscrowStatus[] = ["holding", "released", "refunded"];

function EscrowsTab({ orders }: { orders: ApiOrder[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listEscrowsApi({ page_size: 50 }), []);
  const [orderId, setOrderId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [heldAmount, setHeldAmount] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId || !currencyId) return;
    setBusy(true);
    setFormError("");
    const payload: EscrowCreatePayload = {
      order: Number(orderId),
      currency: Number(currencyId),
      ...(heldAmount.trim() ? { held_amount: heldAmount.trim() } : {}),
    };
    try {
      await createEscrowApi(payload);
      setOrderId("");
      setCurrencyId("");
      setHeldAmount("");
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not reach the server.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function release(id: number) {
    try {
      await releaseEscrowApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Release failed.") : "Could not reach the server.");
    }
  }
  async function remove(id: number) {
    try {
      await deleteEscrowApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiEscrow>[] = [
    {
      key: "order",
      header: "Order",
      render: (e) => orders.find((o) => o.id === e.order)?.order_number ?? `#${e.order}`,
      exportValue: (e) => orders.find((o) => o.id === e.order)?.order_number ?? "",
    },
    { key: "held", header: "Held", render: (e) => e.held_amount, exportValue: (e) => e.held_amount },
    { key: "released", header: "Released", render: (e) => e.released_amount, exportValue: (e) => e.released_amount },
    { key: "refunded", header: "Refunded", render: (e) => e.refunded_amount, exportValue: (e) => e.refunded_amount },
    {
      key: "status",
      header: "Status",
      render: (e) => <Badge variant={e.status === "holding" ? "secondary" : "outline"}>{e.status}</Badge>,
      exportValue: (e) => e.status,
    },
    {
      key: "actions",
      header: "",
      render: (e) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={e.status !== "holding"} onClick={() => void release(e.id)}>
            Release
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(e.id)}>
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
        <h2 className="text-sm font-semibold text-foreground">Open an escrow</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Order</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={orders.length ? "Select" : "None yet"} />
              </SelectTrigger>
              <SelectContent>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.order_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Currency ID</Label>
            <Input className="w-24" value={currencyId} onChange={(e) => setCurrencyId(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Held amount</Label>
            <Input className="w-28" value={heldAmount} onChange={(e) => setHeldAmount(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Open
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
            getRowId={(e) => String(e.id)}
            searchFields={(e) => e.status}
            exportFileName="escrows"
            paginate
            searchPlaceholder="Search by status…"
            emptyMessage="No escrows yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

const PAYOUT_STATUSES: PayoutStatus[] = ["pending", "processing", "completed", "failed"];

function PayoutsTab({ orders, users, organizations }: { orders: ApiOrder[]; users: ApiUser[]; organizations: ApiOrganizationFull[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listPayoutsApi({ page_size: 50 }), []);
  const [orderId, setOrderId] = useState("");
  const [recipientKind, setRecipientKind] = useState<OwnerKind>("user");
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId || !recipientId || !amount.trim() || !currencyId) return;
    setBusy(true);
    setFormError("");
    const payload: PayoutCreatePayload = {
      order: Number(orderId),
      amount: amount.trim(),
      currency: Number(currencyId),
      ...(recipientKind === "user" ? { recipient_user: Number(recipientId) } : { recipient_org: Number(recipientId) }),
    };
    try {
      await createPayoutApi(payload);
      setOrderId("");
      setRecipientId("");
      setAmount("");
      setCurrencyId("");
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not reach the server.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(p: ApiPayout, status: PayoutStatus) {
    try {
      await patchPayoutApi(p.id, { status });
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Update failed.") : "Could not reach the server.");
    }
  }
  async function remove(id: number) {
    try {
      await deletePayoutApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiPayout>[] = [
    {
      key: "order",
      header: "Order",
      render: (p) => orders.find((o) => o.id === p.order)?.order_number ?? `#${p.order}`,
      exportValue: (p) => orders.find((o) => o.id === p.order)?.order_number ?? "",
    },
    {
      key: "recipient",
      header: "Recipient",
      render: (p) => partyLabel(users, organizations, p.recipient_user, p.recipient_org),
      exportValue: (p) => partyLabel(users, organizations, p.recipient_user, p.recipient_org),
    },
    { key: "amount", header: "Amount", render: (p) => p.amount, exportValue: (p) => p.amount },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <Select value={p.status} onValueChange={(v) => void setStatus(p, v as PayoutStatus)}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYOUT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      exportValue: (p) => p.status,
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex justify-end">
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
        <h2 className="text-sm font-semibold text-foreground">Record a payout</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Order</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={orders.length ? "Select" : "None yet"} />
              </SelectTrigger>
              <SelectContent>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.order_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <OwnerPicker
            users={users}
            organizations={organizations}
            ownerKind={recipientKind}
            setOwnerKind={setRecipientKind}
            ownerId={recipientId}
            setOwnerId={setRecipientId}
            userLabel="Recipient"
          />
          <div className="grid gap-2">
            <Label>Amount</Label>
            <Input className="w-28" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Currency ID</Label>
            <Input className="w-24" value={currencyId} onChange={(e) => setCurrencyId(e.target.value)} required />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Record
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
            getRowId={(p) => String(p.id)}
            searchFields={(p) => partyLabel(users, organizations, p.recipient_user, p.recipient_org)}
            exportFileName="payouts"
            paginate
            searchPlaceholder="Search by recipient…"
            emptyMessage="No payouts yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- Invoices -------------------------------- */

const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "issued", "paid", "overdue", "void"];

function InvoicesTab({
  orders,
  users,
  organizations,
  onOpenLines,
}: {
  orders: ApiOrder[];
  users: ApiUser[];
  organizations: ApiOrganizationFull[];
  onOpenLines: (invoice: ApiInvoice) => void;
}) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listInvoicesApi({ page_size: 50 }), []);
  const [invNumber, setInvNumber] = useState("");
  const [orderId, setOrderId] = useState("");
  const [issuerKind, setIssuerKind] = useState<OwnerKind>("organization");
  const [issuerId, setIssuerId] = useState("");
  const [recipientKind, setRecipientKind] = useState<OwnerKind>("user");
  const [recipientId, setRecipientId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [grandTotal, setGrandTotal] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!invNumber.trim() || !orderId || !currencyId || !subtotal.trim() || !grandTotal.trim()) return;
    setBusy(true);
    setFormError("");
    const payload: InvoiceCreatePayload = {
      inv_number: invNumber.trim(),
      order: Number(orderId),
      currency: Number(currencyId),
      subtotal: subtotal.trim(),
      grand_total: grandTotal.trim(),
      ...(issuerId ? (issuerKind === "user" ? { issuer_user: Number(issuerId) } : { issuer_org: Number(issuerId) }) : {}),
      ...(recipientId ? (recipientKind === "user" ? { recipient_user: Number(recipientId) } : { recipient_org: Number(recipientId) }) : {}),
    };
    try {
      await createInvoiceApi(payload);
      setInvNumber("");
      setOrderId("");
      setIssuerId("");
      setRecipientId("");
      setCurrencyId("");
      setSubtotal("");
      setGrandTotal("");
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not reach the server.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(inv: ApiInvoice, status: InvoiceStatus) {
    try {
      await patchInvoiceApi(inv.id, { status });
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Update failed.") : "Could not reach the server.");
    }
  }
  async function remove(id: number) {
    try {
      await deleteInvoiceApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiInvoice>[] = [
    { key: "number", header: "Invoice #", render: (i) => i.inv_number, exportValue: (i) => i.inv_number },
    {
      key: "order",
      header: "Order",
      render: (i) => orders.find((o) => o.id === i.order)?.order_number ?? `#${i.order}`,
      exportValue: (i) => orders.find((o) => o.id === i.order)?.order_number ?? "",
    },
    {
      key: "recipient",
      header: "Recipient",
      render: (i) => partyLabel(users, organizations, i.recipient_user, i.recipient_org),
      exportValue: (i) => partyLabel(users, organizations, i.recipient_user, i.recipient_org),
    },
    { key: "total", header: "Grand total", render: (i) => i.grand_total, exportValue: (i) => i.grand_total },
    {
      key: "status",
      header: "Status",
      render: (i) => (
        <Select value={i.status} onValueChange={(v) => void setStatus(i, v as InvoiceStatus)}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INVOICE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      exportValue: (i) => i.status,
    },
    {
      key: "actions",
      header: "",
      render: (i) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => onOpenLines(i)}>
            Lines
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(i.id)}>
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
        <h2 className="text-sm font-semibold text-foreground">Create an invoice</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Invoice number</Label>
            <Input className="w-36" value={invNumber} onChange={(e) => setInvNumber(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Order</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={orders.length ? "Select" : "None yet"} />
              </SelectTrigger>
              <SelectContent>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.order_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <OwnerPicker
            users={users}
            organizations={organizations}
            ownerKind={issuerKind}
            setOwnerKind={setIssuerKind}
            ownerId={issuerId}
            setOwnerId={setIssuerId}
            userLabel="Issuer"
          />
          <OwnerPicker
            users={users}
            organizations={organizations}
            ownerKind={recipientKind}
            setOwnerKind={setRecipientKind}
            ownerId={recipientId}
            setOwnerId={setRecipientId}
            userLabel="Recipient"
          />
          <div className="grid gap-2">
            <Label>Currency ID</Label>
            <Input className="w-24" value={currencyId} onChange={(e) => setCurrencyId(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Subtotal</Label>
            <Input className="w-24" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Grand total</Label>
            <Input className="w-24" value={grandTotal} onChange={(e) => setGrandTotal(e.target.value)} required />
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
            getRowId={(i) => String(i.id)}
            searchFields={(i) => `${i.inv_number} ${i.status}`}
            exportFileName="invoices"
            paginate
            searchPlaceholder="Search by invoice number or status…"
            emptyMessage="No invoices yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

function InvoiceLinesPanel({ invoice, orderLines }: { invoice: ApiInvoice; orderLines: ApiOrderLine[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(
    () => listInvoiceLinesApi({ invoice: invoice.id, page_size: 100 }),
    [invoice.id],
  );
  const [orderLineId, setOrderLineId] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [lineTotal, setLineTotal] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderLineId || !description.trim() || !quantity.trim() || !unitPrice.trim() || !lineTotal.trim()) return;
    setBusy(true);
    setFormError("");
    const payload: InvoiceLinePayload = {
      invoice: invoice.id,
      order_line: Number(orderLineId),
      description: description.trim(),
      quantity: quantity.trim(),
      unit_price: unitPrice.trim(),
      line_total: lineTotal.trim(),
    };
    try {
      await createInvoiceLineApi(payload);
      setOrderLineId("");
      setDescription("");
      setQuantity("");
      setUnitPrice("");
      setLineTotal("");
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not reach the server.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteInvoiceLineApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiInvoiceLine>[] = [
    { key: "line", header: "Order line", render: (l) => `#${l.order_line}`, exportValue: (l) => l.order_line },
    { key: "desc", header: "Description", render: (l) => l.description, exportValue: (l) => l.description },
    { key: "qty", header: "Qty", render: (l) => l.quantity, exportValue: (l) => l.quantity },
    { key: "price", header: "Unit price", render: (l) => l.unit_price, exportValue: (l) => l.unit_price },
    { key: "total", header: "Line total", render: (l) => l.line_total, exportValue: (l) => l.line_total },
    {
      key: "actions",
      header: "",
      render: (l) => (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => void remove(l.id)}>
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
        <h3 className="text-sm font-semibold text-foreground">Add a line — Invoice {invoice.inv_number}</h3>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Order line</Label>
            <Select value={orderLineId} onValueChange={setOrderLineId}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={orderLines.length ? "Select" : "None yet"} />
              </SelectTrigger>
              <SelectContent>
                {orderLines.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    Line #{l.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid min-w-[12rem] gap-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Qty</Label>
            <Input className="w-20" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Unit price</Label>
            <Input className="w-24" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Line total</Label>
            <Input className="w-24" value={lineTotal} onChange={(e) => setLineTotal(e.target.value)} required />
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
            searchFields={(l) => l.description}
            exportFileName="invoice-lines"
            paginate
            searchPlaceholder="Search by description…"
            emptyMessage="No lines on this invoice yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

function InvoicesAndLinesTab({
  orders,
  users,
  organizations,
  orderLines,
}: {
  orders: ApiOrder[];
  users: ApiUser[];
  organizations: ApiOrganizationFull[];
  orderLines: ApiOrderLine[];
}) {
  const [selected, setSelected] = useState<ApiInvoice | null>(null);

  if (selected) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="outline" onClick={() => setSelected(null)}>
          ← Back to all invoices
        </Button>
        <InvoiceLinesPanel invoice={selected} orderLines={orderLines} />
      </div>
    );
  }

  return <InvoicesTab orders={orders} users={users} organizations={organizations} onOpenLines={setSelected} />;
}

/* --------------------------------- Disputes & returns -------------------------------- */

const RETURN_REASONS: ReturnReason[] = ["damaged", "quality_issue", "wrong_item", "spoiled", "other"];
const RETURN_STATUSES: ReturnStatus[] = ["requested", "approved", "rejected", "completed"];

function ReturnRequestsTab({ orders, users, organizations }: { orders: ApiOrder[]; users: ApiUser[]; organizations: ApiOrganizationFull[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(
    () => listReturnRequestsApi({ page_size: 50 }),
    [],
  );
  const [returnNumber, setReturnNumber] = useState("");
  const [orderId, setOrderId] = useState("");
  const [ownerKind, setOwnerKind] = useState<OwnerKind>("user");
  const [ownerId, setOwnerId] = useState("");
  const [reason, setReason] = useState<ReturnReason>("damaged");
  const [refundAmount, setRefundAmount] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!returnNumber.trim() || !orderId || !ownerId) return;
    setBusy(true);
    setFormError("");
    const payload: ReturnRequestCreatePayload = {
      return_number: returnNumber.trim(),
      order: Number(orderId),
      reason,
      ...(ownerKind === "user" ? { user: Number(ownerId) } : { org: Number(ownerId) }),
      ...(refundAmount.trim() ? { refund_amount: refundAmount.trim() } : {}),
    };
    try {
      await createReturnRequestApi(payload);
      setReturnNumber("");
      setOrderId("");
      setOwnerId("");
      setRefundAmount("");
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not reach the server.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(r: ApiReturnRequest, status: ReturnStatus) {
    try {
      await patchReturnRequestApi(r.id, { reason: r.reason, status });
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Update failed.") : "Could not reach the server.");
    }
  }
  async function remove(id: number) {
    try {
      await deleteReturnRequestApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiReturnRequest>[] = [
    { key: "number", header: "Return #", render: (r) => r.return_number, exportValue: (r) => r.return_number },
    {
      key: "order",
      header: "Order",
      render: (r) => orders.find((o) => o.id === r.order)?.order_number ?? `#${r.order}`,
      exportValue: (r) => orders.find((o) => o.id === r.order)?.order_number ?? "",
    },
    {
      key: "filed_by",
      header: "Filed by",
      render: (r) => partyLabel(users, organizations, r.user, r.org),
      exportValue: (r) => partyLabel(users, organizations, r.user, r.org),
    },
    { key: "reason", header: "Reason", render: (r) => r.reason, exportValue: (r) => r.reason },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Select value={r.status} onValueChange={(v) => void setStatus(r, v as ReturnStatus)}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RETURN_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
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
          <Button size="sm" variant="outline" onClick={() => void remove(r.id)}>
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
        <h2 className="text-sm font-semibold text-foreground">File a return request</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Return number</Label>
            <Input className="w-36" value={returnNumber} onChange={(e) => setReturnNumber(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Order</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={orders.length ? "Select" : "None yet"} />
              </SelectTrigger>
              <SelectContent>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.order_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <OwnerPicker
            users={users}
            organizations={organizations}
            ownerKind={ownerKind}
            setOwnerKind={setOwnerKind}
            ownerId={ownerId}
            setOwnerId={setOwnerId}
            userLabel="Filed by"
          />
          <div className="grid gap-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as ReturnReason)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETURN_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Refund amount</Label>
            <Input className="w-28" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            File
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
            searchFields={(r) => `${r.return_number} ${r.reason} ${r.status}`}
            exportFileName="return-requests"
            paginate
            searchPlaceholder="Search by return number, reason or status…"
            emptyMessage="No return requests yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

function ReturnLinesTab({ returnRequests, orderLines }: { returnRequests: ApiReturnRequest[]; orderLines: ApiOrderLine[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listReturnLinesApi({ page_size: 50 }), []);
  const [returnReqId, setReturnReqId] = useState("");
  const [orderLineId, setOrderLineId] = useState("");
  const [qtyReturned, setQtyReturned] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!returnReqId || !orderLineId || !qtyReturned.trim() || !refundAmount.trim()) return;
    setBusy(true);
    setFormError("");
    const payload: ReturnLinePayload = {
      return_req: Number(returnReqId),
      order_line: Number(orderLineId),
      qty_returned: qtyReturned.trim(),
      refund_amount: refundAmount.trim(),
    };
    try {
      await createReturnLineApi(payload);
      setReturnReqId("");
      setOrderLineId("");
      setQtyReturned("");
      setRefundAmount("");
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not reach the server.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteReturnLineApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiReturnLine>[] = [
    {
      key: "return",
      header: "Return request",
      render: (l) => returnRequests.find((r) => r.id === l.return_req)?.return_number ?? `#${l.return_req}`,
      exportValue: (l) => returnRequests.find((r) => r.id === l.return_req)?.return_number ?? "",
    },
    { key: "line", header: "Order line", render: (l) => `#${l.order_line}`, exportValue: (l) => l.order_line },
    { key: "qty", header: "Qty returned", render: (l) => l.qty_returned, exportValue: (l) => l.qty_returned },
    { key: "refund", header: "Refund amount", render: (l) => l.refund_amount, exportValue: (l) => l.refund_amount },
    {
      key: "actions",
      header: "",
      render: (l) => (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => void remove(l.id)}>
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
        <h2 className="text-sm font-semibold text-foreground">Add a return line</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Return request</Label>
            <Select value={returnReqId} onValueChange={setReturnReqId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={returnRequests.length ? "Select" : "None yet"} />
              </SelectTrigger>
              <SelectContent>
                {returnRequests.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.return_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Order line</Label>
            <Select value={orderLineId} onValueChange={setOrderLineId}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={orderLines.length ? "Select" : "None yet"} />
              </SelectTrigger>
              <SelectContent>
                {orderLines.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    Line #{l.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Qty returned</Label>
            <Input className="w-28" value={qtyReturned} onChange={(e) => setQtyReturned(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Refund amount</Label>
            <Input className="w-28" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} required />
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
            searchFields={(l) => String(l.return_req)}
            exportFileName="return-lines"
            paginate
            searchPlaceholder="Search…"
            emptyMessage="No return lines yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

const DISPUTE_STATUSES: DisputeStatus[] = ["open", "under_review", "resolved", "dismissed"];

function DisputesTab({ orders, users, organizations }: { orders: ApiOrder[]; users: ApiUser[]; organizations: ApiOrganizationFull[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listDisputesApi({ page_size: 50 }), []);
  const [orderId, setOrderId] = useState("");
  const [raisedKind, setRaisedKind] = useState<OwnerKind>("user");
  const [raisedId, setRaisedId] = useState("");
  const [againstKind, setAgainstKind] = useState<OwnerKind>("user");
  const [againstId, setAgainstId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resolutionDraft, setResolutionDraft] = useState<Record<number, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId || !raisedId || !againstId || !subject.trim() || !description.trim()) return;
    setBusy(true);
    setFormError("");
    const payload: DisputeCreatePayload = {
      order: Number(orderId),
      subject: subject.trim(),
      description: description.trim(),
      ...(raisedKind === "user" ? { raised_user: Number(raisedId) } : { raised_org: Number(raisedId) }),
      ...(againstKind === "user" ? { against_user: Number(againstId) } : { against_org: Number(againstId) }),
    };
    try {
      await createDisputeApi(payload);
      setOrderId("");
      setRaisedId("");
      setAgainstId("");
      setSubject("");
      setDescription("");
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not reach the server.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(d: ApiDispute, status: DisputeStatus) {
    try {
      await patchDisputeApi(d.id, { subject: d.subject, description: d.description, status });
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Update failed.") : "Could not reach the server.");
    }
  }

  async function resolve(d: ApiDispute, dismiss: boolean) {
    const resolution = resolutionDraft[d.id]?.trim();
    if (!resolution) return;
    try {
      await resolveDisputeApi(d.id, { resolution, dismiss });
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Resolve failed.") : "Could not reach the server.");
    }
  }

  async function remove(id: number) {
    try {
      await deleteDisputeApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiDispute>[] = [
    { key: "subject", header: "Subject", render: (d) => d.subject, exportValue: (d) => d.subject },
    {
      key: "order",
      header: "Order",
      render: (d) => orders.find((o) => o.id === d.order)?.order_number ?? `#${d.order}`,
      exportValue: (d) => orders.find((o) => o.id === d.order)?.order_number ?? "",
    },
    {
      key: "raised",
      header: "Raised by",
      render: (d) => partyLabel(users, organizations, d.raised_user, d.raised_org),
      exportValue: (d) => partyLabel(users, organizations, d.raised_user, d.raised_org),
    },
    {
      key: "against",
      header: "Against",
      render: (d) => partyLabel(users, organizations, d.against_user, d.against_org),
      exportValue: (d) => partyLabel(users, organizations, d.against_user, d.against_org),
    },
    {
      key: "status",
      header: "Status",
      render: (d) => (
        <Select value={d.status} onValueChange={(v) => void setStatus(d, v as DisputeStatus)}>
          <SelectTrigger className="h-8 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DISPUTE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      exportValue: (d) => d.status,
    },
    {
      key: "resolve",
      header: "Resolve",
      render: (d) => (
        <div className="flex items-center gap-2">
          <Input
            className="h-8 w-32"
            placeholder="Resolution…"
            value={resolutionDraft[d.id] ?? ""}
            onChange={(e) => setResolutionDraft((prev) => ({ ...prev, [d.id]: e.target.value }))}
          />
          <Button size="sm" variant="outline" onClick={() => void resolve(d, false)}>
            Resolve
          </Button>
          <Button size="sm" variant="outline" onClick={() => void resolve(d, true)}>
            Dismiss
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
    {
      key: "actions",
      header: "",
      render: (d) => (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => void remove(d.id)}>
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
        <h2 className="text-sm font-semibold text-foreground">Raise a dispute</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Order</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={orders.length ? "Select" : "None yet"} />
              </SelectTrigger>
              <SelectContent>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.order_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <OwnerPicker
            users={users}
            organizations={organizations}
            ownerKind={raisedKind}
            setOwnerKind={setRaisedKind}
            ownerId={raisedId}
            setOwnerId={setRaisedId}
            userLabel="Raised by"
          />
          <OwnerPicker
            users={users}
            organizations={organizations}
            ownerKind={againstKind}
            setOwnerKind={setAgainstKind}
            ownerId={againstId}
            setOwnerId={setAgainstId}
            userLabel="Against"
          />
          <div className="grid gap-2">
            <Label>Subject</Label>
            <Input className="w-44" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div className="grid min-w-[16rem] flex-1 gap-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Raise
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
            getRowId={(d) => String(d.id)}
            searchFields={(d) => `${d.subject} ${d.status}`}
            exportFileName="disputes"
            paginate
            searchPlaceholder="Search by subject or status…"
            emptyMessage="No disputes yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* ----------------------------------- Page ----------------------------------- */

function TransactionsDataPage() {
  const usersList = useApiList(() => listUsersApi({ page_size: 100 }), []);
  const organizationsList = useApiList(() => listOrganizationsApi({ page_size: 100 }), []);
  const currenciesList = useApiList(() => listCurrenciesApi({ page_size: 100 }), []);
  const variantsList = useApiList(() => listVariantsApi({ page_size: 100 }), []);
  const listingsList = useApiList(() => listListingsApi({ page_size: 100 }), []);
  const ordersList = useApiList(() => listOrdersApi({ page_size: 100 }), []);
  const orderLinesList = useApiList(() => listOrderLinesApi({ page_size: 100 }), []);
  const payMethodsList = useApiList(() => listPayMethodsApi({}), []);
  const paymentsList = useApiList(() => listPaymentsApi({ page_size: 100 }), []);
  const returnRequestsList = useApiList(() => listReturnRequestsApi({ page_size: 100 }), []);

  return (
    <AppShell
      title="Transactions"
      description="Manage orders, payments, invoicing and disputes on the live API."
    >
      <StaffAccessNotice />
      <Tabs defaultValue="orders">
        <TabsList className="flex-wrap">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="pay-methods">Payment methods</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="pay-txns">Provider transactions</TabsTrigger>
          <TabsTrigger value="escrows">Escrows</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="return-requests">Return requests</TabsTrigger>
          <TabsTrigger value="return-lines">Return lines</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <OrdersAndDetailTab
            users={usersList.items}
            organizations={organizationsList.items}
            currencies={currenciesList.items}
            variants={variantsList.items}
            listings={listingsList.items}
          />
        </TabsContent>
        <TabsContent value="pay-methods">
          <PayMethodsTab />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab orders={ordersList.items} payMethods={payMethodsList.items} />
        </TabsContent>
        <TabsContent value="pay-txns">
          <PayTxnsTab payments={paymentsList.items} />
        </TabsContent>
        <TabsContent value="escrows">
          <EscrowsTab orders={ordersList.items} />
        </TabsContent>
        <TabsContent value="payouts">
          <PayoutsTab orders={ordersList.items} users={usersList.items} organizations={organizationsList.items} />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoicesAndLinesTab
            orders={ordersList.items}
            users={usersList.items}
            organizations={organizationsList.items}
            orderLines={orderLinesList.items}
          />
        </TabsContent>
        <TabsContent value="return-requests">
          <ReturnRequestsTab orders={ordersList.items} users={usersList.items} organizations={organizationsList.items} />
        </TabsContent>
        <TabsContent value="return-lines">
          <ReturnLinesTab returnRequests={returnRequestsList.items} orderLines={orderLinesList.items} />
        </TabsContent>
        <TabsContent value="disputes">
          <DisputesTab orders={ordersList.items} users={usersList.items} organizations={organizationsList.items} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
