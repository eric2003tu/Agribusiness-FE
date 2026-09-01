import { useMemo } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ClipboardList, Clock, Package, PackageCheck, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { FinanceCharts, type MoneyGivenPoint } from "@/components/finance-charts";
import { useWorkspace } from "@/lib/workspace-store";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Finance Dashboard — TaskFlow" },
      {
        name: "description",
        content: "An overview of money given, pending decisions and budget request volume.",
      },
    ],
  }),
  component: FinanceDashboard,
});

function FinanceDashboard() {
  const {
    budgets,
    requisitions,
    procurementItems,
    materialRequests,
    currentApproverId,
    currentUser,
  } = useWorkspace();

  const needsAction = budgets.filter(
    (b) => b.status === "pending" && currentApproverId(b) === currentUser.id,
  );
  const approvedUndisbursed = budgets.filter((b) => b.status === "approved" && !b.disbursed);
  const disbursedTotal = budgets.filter((b) => b.disbursed).length;

  const materialRequestFor = (procurementItemId: string) => {
    const item = procurementItems.find((p) => p.id === procurementItemId);
    return item?.materialRequestId
      ? materialRequests.find((r) => r.id === item.materialRequestId)
      : undefined;
  };
  const requisitionsNeedingReview = requisitions.filter(
    (r) => r.status === "pending" && !!materialRequestFor(r.procurementItemId),
  );

  // Requisitions tied to a Budget draw against that same Budget's pool, so
  // counting them on top of the Budget's own `disbursed` flag would double
  // count the same money — only material-request-derived requisitions (no
  // shared Budget pool) are safe to add on top of disbursed budgets here.
  const approvedMaterialRequisitions = requisitions.filter(
    (r) => r.status === "approved" && !!materialRequestFor(r.procurementItemId),
  );

  const totalMoneyGiven =
    budgets.filter((b) => b.disbursed).reduce((sum, b) => sum + b.requestedAmount, 0) +
    approvedMaterialRequisitions.reduce((sum, r) => sum + r.amount, 0);

  const pendingMoneyToGive =
    needsAction.reduce((sum, b) => sum + b.requestedAmount, 0) +
    approvedUndisbursed.reduce((sum, b) => sum + b.requestedAmount, 0) +
    requisitionsNeedingReview.reduce((sum, r) => sum + r.amount, 0);

  const moneyGivenByMonth = useMemo<MoneyGivenPoint[]>(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        month: d.toLocaleDateString(undefined, { month: "short" }),
        amount: 0,
      };
    });
    const bucket = (dateStr: string, amount: number) => {
      const d = new Date(dateStr);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const point = months.find((m) => m.key === key);
      if (point) point.amount += amount;
    };
    budgets
      .filter((b) => b.disbursed && b.disbursedAt)
      .forEach((b) => bucket(b.disbursedAt!, b.requestedAmount));
    approvedMaterialRequisitions
      .filter((r) => r.decidedAt)
      .forEach((r) => bucket(r.decidedAt!, r.amount));
    return months.map(({ month, amount }) => ({ month, amount }));
  }, [budgets, approvedMaterialRequisitions]);

  return (
    <AppShell
      allowedRoles={["admin", "finance"]}
      title="Finance Dashboard"
      description="An overview of money given, what's pending, and budget request volume."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Wallet}
          title="Total money given"
          value={`${totalMoneyGiven.toLocaleString()} RWF`}
          tone="success"
          hint="Disbursed budgets + paid material requisitions"
        />
        <StatCard
          icon={Clock}
          title="Pending money to give"
          value={`${pendingMoneyToGive.toLocaleString()} RWF`}
          tone="warning"
          hint="Awaiting a decision or disbursement"
        />
        <StatCard
          icon={ClipboardList}
          title="Total budget requests"
          value={budgets.length}
          tone="brand"
          hint="Every request that has reached you"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Link to="/budgets" className="block">
          <StatCard
            icon={Wallet}
            title="Budgets needing review"
            value={needsAction.length}
            tone="brand"
            hint="Open Budget Approvals"
          />
        </Link>
        <Link to="/requisitions" className="block">
          <StatCard
            icon={Package}
            title="Requisitions needing review"
            value={requisitionsNeedingReview.length}
            tone="brand"
            hint="Open Requisitions"
          />
        </Link>
        <Link to="/budgets" className="block">
          <StatCard
            icon={PackageCheck}
            title="Approved, not yet disbursed"
            value={approvedUndisbursed.length}
            tone="soft"
            hint="Open Budget Approvals"
          />
        </Link>
        <StatCard icon={CheckCircle2} title="Disbursed" value={disbursedTotal} tone="success" />
      </div>

      <FinanceCharts budgets={budgets} moneyGivenByMonth={moneyGivenByMonth} />
    </AppShell>
  );
}
