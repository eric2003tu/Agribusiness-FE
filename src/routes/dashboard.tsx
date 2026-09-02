import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus, Truck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  AdminDashboard,
  BuyerDashboard,
  FarmerDashboard,
  SupplierDashboard,
  TransporterDashboard,
} from "@/components/dashboard-views";
import { useWorkspace } from "@/lib/workspace-store";
import { ROLE_LABELS, primaryRole } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Agribridge" },
      {
        name: "description",
        content:
          "Role-based dashboards for farmers, buyers, suppliers and admins on the Agribridge marketplace.",
      },
      { property: "og:title", content: "Dashboard — Agribridge" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { currentUser } = useWorkspace();
  const role = primaryRole(currentUser);

  const actions =
    role === "farmer" ? (
      <Button asChild>
        <Link to="/listings/new">
          <Plus className="size-4" /> New listing
        </Link>
      </Button>
    ) : role === "buyer" ? (
      <Button asChild>
        <Link to="/requests/new">
          <Plus className="size-4" /> New request
        </Link>
      </Button>
    ) : role === "supplier" ? (
      <Button asChild>
        <Link to="/inputs/new">
          <Plus className="size-4" /> List an input
        </Link>
      </Button>
    ) : role === "transporter" ? (
      <Button asChild>
        <Link to="/transport-pool">
          <Truck className="size-4" /> Transport pooling
        </Link>
      </Button>
    ) : undefined;

  return (
    <AppShell
      title={`${ROLE_LABELS[role]} dashboard`}
      description={`Welcome back, ${currentUser.name.split(" ")[0]}.`}
      actions={actions}
    >
      {role === "farmer" && <FarmerDashboard />}
      {role === "buyer" && <BuyerDashboard />}
      {role === "supplier" && <SupplierDashboard />}
      {role === "admin" && <AdminDashboard />}
      {role === "transporter" && <TransporterDashboard />}
    </AppShell>
  );
}
