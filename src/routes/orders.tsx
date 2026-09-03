import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock3, RotateCcw, ShoppingCart, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionStatusBadge } from "@/components/status-badge";
import { ProductIllustration } from "@/components/product-illustration";
import { DataTable, type Column, type FilterConfig } from "@/components/data-table";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import {
  PAYMENT_METHOD_LABELS,
  TRANSACTION_STATUS_LABELS,
  productById,
  type Transaction,
} from "@/lib/mock-data";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Orders — Agribridge" },
      { name: "description", content: "Track what you've bought and what you've sold." },
    ],
  }),
  component: OrdersPage,
});

const NEEDS_ACTION_STATUSES = new Set<Transaction["status"]>([
  "pending",
  "confirmed_by_seller",
  "confirmed_by_buyer",
]);

function OrdersPage() {
  const { myTransactions, currentUser, userById, confirmTransaction } = useWorkspace();

  const purchases = myTransactions.filter((t) => t.buyerId === currentUser.id);
  const sales = myTransactions.filter((t) => t.sellerId === currentUser.id);

  function buildColumns(perspective: "buyer" | "seller"): Column<Transaction>[] {
    return [
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
        header: "Total value",
        render: (t) => formatRwf(t.quantity * t.unitPrice),
        exportValue: (t) => t.quantity * t.unitPrice,
      },
      {
        key: "party",
        header: perspective === "buyer" ? "Seller" : "Buyer",
        render: (t) => userById(perspective === "buyer" ? t.sellerId : t.buyerId)?.name ?? "—",
        exportValue: (t) => userById(perspective === "buyer" ? t.sellerId : t.buyerId)?.name ?? "",
      },
      {
        key: "payment",
        header: "Payment",
        render: (t) => (t.paymentMethod ? PAYMENT_METHOD_LABELS[t.paymentMethod] : "—"),
        exportValue: (t) => (t.paymentMethod ? PAYMENT_METHOD_LABELS[t.paymentMethod] : ""),
      },
      {
        key: "date",
        header: "Date",
        render: (t) => t.createdAt,
        exportValue: (t) => t.createdAt,
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
        render: (t) => {
          const needsMyConfirmation =
            NEEDS_ACTION_STATUSES.has(t.status) &&
            (perspective === "buyer" ? !t.confirmedByBuyer : !t.confirmedBySeller);
          return (
            <div className="flex flex-wrap justify-end gap-2">
              {needsMyConfirmation && (
                <Button size="sm" onClick={() => confirmTransaction(t.id, perspective)}>
                  Confirm
                </Button>
              )}
              <Button asChild size="sm" variant="outline">
                <Link to="/transactions/$transactionId" params={{ transactionId: t.id }}>
                  View
                </Link>
              </Button>
            </div>
          );
        },
        exportValue: () => "",
      },
    ];
  }

  const filters: FilterConfig<Transaction>[] = [
    {
      key: "status",
      label: "Status",
      options: Object.entries(TRANSACTION_STATUS_LABELS).map(([value, label]) => ({ value, label })),
      match: (t, v) => t.status === v,
    },
  ];

  return (
    <AppShell title="Orders" description="Track what you've bought and what you've sold.">
      <Tabs defaultValue="purchases">
        <TabsList>
          <TabsTrigger value="purchases">Purchases ({purchases.length})</TabsTrigger>
          <TabsTrigger value="sales">Sales ({sales.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={ShoppingCart} title="Orders placed" value={purchases.length} tone="brand" />
            <StatCard
              icon={CheckCircle2}
              title="Completed"
              value={purchases.filter((t) => t.status === "completed").length}
              tone="success"
            />
            <StatCard
              icon={Clock3}
              title="Needs your confirmation"
              value={purchases.filter((t) => NEEDS_ACTION_STATUSES.has(t.status) && !t.confirmedByBuyer).length}
              tone="warning"
            />
            <StatCard
              icon={Wallet}
              title="Total spent"
              value={formatRwf(purchases.reduce((s, t) => s + t.quantity * t.unitPrice, 0))}
              tone="soft"
            />
          </div>

          <DataTable
            rows={purchases}
            columns={buildColumns("buyer")}
            getRowId={(t) => t.id}
            searchFields={(t) => `${productById(t.productId)?.name} ${userById(t.sellerId)?.name}`}
            filters={filters}
            exportFileName="my-purchases"
            paginate
            searchPlaceholder="Search by product or seller…"
            emptyMessage="You haven't bought anything yet."
          />
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={ShoppingCart} title="Orders received" value={sales.length} tone="brand" />
            <StatCard
              icon={CheckCircle2}
              title="Completed"
              value={sales.filter((t) => t.status === "completed").length}
              tone="success"
            />
            <StatCard
              icon={Clock3}
              title="Needs your confirmation"
              value={sales.filter((t) => NEEDS_ACTION_STATUSES.has(t.status) && !t.confirmedBySeller).length}
              tone="warning"
            />
            <StatCard
              icon={RotateCcw}
              title="Total revenue"
              value={formatRwf(sales.reduce((s, t) => s + t.quantity * t.unitPrice, 0))}
              tone="soft"
            />
          </div>

          <DataTable
            rows={sales}
            columns={buildColumns("seller")}
            getRowId={(t) => t.id}
            searchFields={(t) => `${productById(t.productId)?.name} ${userById(t.buyerId)?.name}`}
            filters={filters}
            exportFileName="my-sales"
            paginate
            searchPlaceholder="Search by product or buyer…"
            emptyMessage="No one has ordered from you yet."
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
