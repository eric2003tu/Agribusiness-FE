import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { TransactionStatusBadge } from "@/components/status-badge";
import { DataTable, type Column, type FilterConfig } from "@/components/data-table";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import { TRANSACTION_STATUS_LABELS, productById, type Transaction } from "@/lib/mock-data";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — Agribridge" },
      { name: "description", content: "Every deal on the marketplace, from offer to two-sided confirmation." },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { transactions, myTransactions, userById, can } = useWorkspace();

  if (pathname !== "/transactions") {
    return <Outlet />;
  }
  const rows = can("moderate") ? transactions : myTransactions;

  const columns: Column<Transaction>[] = [
    {
      key: "product",
      header: "Product",
      render: (t) => productById(t.productId)?.name ?? "—",
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
        <Button asChild size="sm" variant="outline">
          <Link to="/transactions/$transactionId" params={{ transactionId: t.id }}>
            View
          </Link>
        </Button>
      ),
      exportValue: () => "",
    },
  ];

  const filters: FilterConfig<Transaction>[] = [
    {
      key: "status",
      label: "Status",
      options: Object.entries(TRANSACTION_STATUS_LABELS).map(([value, label]) => ({ value, label })),
      match: (t, v) => t.status === v,
    },
  ];

  return (
    <AppShell title="Transactions" description="Track every deal from agreement to completion.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ShoppingCart} title="Total" value={rows.length} tone="brand" />
        <StatCard
          icon={CheckCircle2}
          title="Completed"
          value={rows.filter((t) => t.status === "completed").length}
          tone="success"
        />
        <StatCard
          icon={AlertTriangle}
          title="Disputed"
          value={rows.filter((t) => t.status === "disputed").length}
          tone={rows.some((t) => t.status === "disputed") ? "danger" : "success"}
        />
        <StatCard
          icon={ShoppingCart}
          title="Total value"
          value={formatRwf(rows.reduce((s, t) => s + t.quantity * t.unitPrice, 0))}
          tone="soft"
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(t) => t.id}
        searchFields={(t) => `${productById(t.productId)?.name} ${userById(t.buyerId)?.name} ${userById(t.sellerId)?.name}`}
        filters={filters}
        exportFileName="transactions"
        paginate
        searchPlaceholder="Search by product, buyer or seller…"
        emptyMessage="No transactions yet."
      />
    </AppShell>
  );
}
