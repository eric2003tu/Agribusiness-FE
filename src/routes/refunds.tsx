import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ListChecks, RotateCcw, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionStatusBadge } from "@/components/status-badge";
import { ProductIllustration } from "@/components/product-illustration";
import { DataTable, type Column, type FilterConfig } from "@/components/data-table";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import { productById, type Transaction } from "@/lib/mock-data";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Refunds — Agribridge" },
      { name: "description", content: "Refunds you've requested and refunds against your sales." },
    ],
  }),
  component: RefundsPage,
});

const STATUS_FILTER_OPTIONS = [
  { value: "refund_requested", label: "Refund requested" },
  { value: "refunded", label: "Refunded" },
];

function RefundsPage() {
  const { transactions, userById, resolveRefund, currentUser, can } = useWorkspace();
  const isModerator = can("moderate");

  const refundCases = transactions.filter(
    (t) => t.status === "refund_requested" || t.status === "refunded",
  );

  function buildColumns(perspective: "all" | "requested" | "received"): Column<Transaction>[] {
    const base: Column<Transaction>[] = [
      {
        key: "product",
        header: "Product",
        render: (t) => (
          <div className="flex items-center gap-3">
            <ProductIllustration productId={t.productId} className="size-10" rounded="rounded-lg" />
            <span className="font-medium text-foreground">{productById(t.productId)?.name ?? "—"}</span>
          </div>
        ),
        exportValue: (t) => productById(t.productId)?.name ?? "",
      },
      {
        key: "quantity",
        header: "Quantity",
        render: (t) => formatQuantity(t.quantity, t.unit),
        exportValue: (t) => t.quantity,
      },
      {
        key: "value",
        header: "Value",
        render: (t) => formatRwf(t.quantity * t.unitPrice),
        exportValue: (t) => t.quantity * t.unitPrice,
      },
    ];

    const partyColumns: Column<Transaction>[] =
      perspective === "all"
        ? [
            {
              key: "buyer",
              header: "Buyer",
              render: (t) => userById(t.buyerId)?.name ?? "—",
              exportValue: (t) => userById(t.buyerId)?.name ?? "",
            },
            {
              key: "seller",
              header: "Seller",
              render: (t) => userById(t.sellerId)?.name ?? "—",
              exportValue: (t) => userById(t.sellerId)?.name ?? "",
            },
          ]
        : [
            {
              key: "party",
              header: perspective === "requested" ? "Seller" : "Buyer",
              render: (t) => userById(perspective === "requested" ? t.sellerId : t.buyerId)?.name ?? "—",
              exportValue: (t) => userById(perspective === "requested" ? t.sellerId : t.buyerId)?.name ?? "",
            },
          ];

    return [
      ...base,
      ...partyColumns,
      {
        key: "reason",
        header: "Reason",
        render: (t) => <span className="line-clamp-2 max-w-xs text-sm text-muted-foreground">{t.refundReason}</span>,
        exportValue: (t) => t.refundReason ?? "",
      },
      {
        key: "status",
        header: "Status",
        render: (t) => <TransactionStatusBadge status={t.status} />,
        exportValue: (t) => t.status,
      },
      {
        key: "actions",
        header: "",
        render: (t) => (
          <div className="flex flex-wrap justify-end gap-2">
            {isModerator && t.status === "refund_requested" && (
              <>
                <Button size="sm" onClick={() => resolveRefund(t.id, true)}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => resolveRefund(t.id, false)}>
                  Deny
                </Button>
              </>
            )}
            <Button asChild size="sm" variant="outline">
              <Link to="/transactions/$transactionId" params={{ transactionId: t.id }}>
                View
              </Link>
            </Button>
          </div>
        ),
        exportValue: () => "",
      },
    ];
  }

  const filters: FilterConfig<Transaction>[] = [
    { key: "status", label: "Status", options: STATUS_FILTER_OPTIONS, match: (t, v) => t.status === v },
  ];

  if (isModerator) {
    const pending = refundCases.filter((t) => t.status === "refund_requested");
    const resolved = refundCases.filter((t) => t.status === "refunded");
    const refundedValue = resolved.reduce((s, t) => s + t.quantity * t.unitPrice, 0);

    return (
      <AppShell title="Refunds" description="Review buyer refund requests and resolve them.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={ListChecks} title="Total refund cases" value={refundCases.length} tone="brand" />
          <StatCard
            icon={RotateCcw}
            title="Pending review"
            value={pending.length}
            tone={pending.length > 0 ? "warning" : "success"}
          />
          <StatCard icon={CheckCircle2} title="Refunded" value={resolved.length} tone="success" />
          <StatCard icon={Wallet} title="Total refunded value" value={formatRwf(refundedValue)} tone="soft" />
        </div>

        <DataTable
          rows={refundCases}
          columns={buildColumns("all")}
          getRowId={(t) => t.id}
          searchFields={(t) => `${productById(t.productId)?.name} ${userById(t.buyerId)?.name} ${userById(t.sellerId)?.name}`}
          filters={filters}
          exportFileName="refunds"
          paginate
          searchPlaceholder="Search by product, buyer or seller…"
          emptyMessage="No refund requests yet."
        />
      </AppShell>
    );
  }

  const requested = refundCases.filter((t) => t.buyerId === currentUser.id);
  const received = refundCases.filter((t) => t.sellerId === currentUser.id);

  return (
    <AppShell title="Refunds" description="Refunds you've requested, and refunds requested against your sales.">
      <Tabs defaultValue="requested">
        <TabsList>
          <TabsTrigger value="requested">Requested ({requested.length})</TabsTrigger>
          <TabsTrigger value="received">Received ({received.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="requested" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={ListChecks} title="Total" value={requested.length} tone="brand" />
            <StatCard
              icon={RotateCcw}
              title="Pending review"
              value={requested.filter((t) => t.status === "refund_requested").length}
              tone="warning"
            />
            <StatCard
              icon={CheckCircle2}
              title="Refunded"
              value={requested.filter((t) => t.status === "refunded").length}
              tone="success"
            />
          </div>
          <DataTable
            rows={requested}
            columns={buildColumns("requested")}
            getRowId={(t) => t.id}
            searchFields={(t) => `${productById(t.productId)?.name} ${userById(t.sellerId)?.name}`}
            filters={filters}
            exportFileName="refunds-requested"
            paginate
            searchPlaceholder="Search by product or seller…"
            emptyMessage="You haven't requested a refund yet."
          />
        </TabsContent>

        <TabsContent value="received" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={ListChecks} title="Total" value={received.length} tone="brand" />
            <StatCard
              icon={RotateCcw}
              title="Pending review"
              value={received.filter((t) => t.status === "refund_requested").length}
              tone="warning"
            />
            <StatCard
              icon={CheckCircle2}
              title="Refunded"
              value={received.filter((t) => t.status === "refunded").length}
              tone="success"
            />
          </div>
          <DataTable
            rows={received}
            columns={buildColumns("received")}
            getRowId={(t) => t.id}
            searchFields={(t) => `${productById(t.productId)?.name} ${userById(t.buyerId)?.name}`}
            filters={filters}
            exportFileName="refunds-received"
            paginate
            searchPlaceholder="Search by product or buyer…"
            emptyMessage="No refunds have been requested against your sales."
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
