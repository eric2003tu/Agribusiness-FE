import { Link, createFileRoute } from "@tanstack/react-router";
import { Sprout, ShoppingBasket, Package, Users as UsersIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { DataTable, type Column, type FilterConfig } from "@/components/data-table";
import { useWorkspace } from "@/lib/workspace-store";
import { ROLE_LABELS, locationLabel, type Role, type User } from "@/lib/mock-data";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users — Agribridge" },
      { name: "description", content: "Every farmer, buyer, supplier and transporter on the platform." },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { users, verifyUser, setUserSuspended } = useWorkspace();

  const columns: Column<User>[] = [
    { key: "name", header: "Name", render: (u) => u.name, exportValue: (u) => u.name },
    { key: "phone", header: "Phone", render: (u) => u.phone, exportValue: (u) => u.phone },
    {
      key: "roles",
      header: "Roles",
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.map((r) => (
            <Badge key={r} variant="secondary">
              {ROLE_LABELS[r]}
            </Badge>
          ))}
        </div>
      ),
      exportValue: (u) => u.roles.join("; "),
    },
    {
      key: "location",
      header: "Location",
      render: (u) => locationLabel(u.locationId),
      exportValue: (u) => locationLabel(u.locationId),
    },
    {
      key: "reliability",
      header: "Reliability",
      render: (u) => <ReliabilityBadge score={u.reliabilityScore} />,
      exportValue: (u) => u.reliabilityScore,
    },
    {
      key: "verified",
      header: "Verified",
      render: (u) => (u.isVerified ? "Yes" : "No"),
      exportValue: (u) => (u.isVerified ? "yes" : "no"),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <Badge variant={u.status === "suspended" ? "destructive" : "secondary"}>
          {u.status === "suspended" ? "Suspended" : "Active"}
        </Badge>
      ),
      exportValue: (u) => u.status,
    },
    {
      key: "actions",
      header: "",
      render: (u) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => verifyUser(u.id, !u.isVerified)}>
            {u.isVerified ? "Unverify" : "Verify"}
          </Button>
          <Button
            size="sm"
            variant={u.status === "suspended" ? "outline" : "destructive"}
            onClick={() => setUserSuspended(u.id, u.status !== "suspended")}
          >
            {u.status === "suspended" ? "Reinstate" : "Suspend"}
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/users/$userId" params={{ userId: u.id }}>
              View
            </Link>
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  const filters: FilterConfig<User>[] = [
    {
      key: "role",
      label: "Role",
      options: (Object.entries(ROLE_LABELS) as Array<[Role, string]>).map(([value, label]) => ({
        value,
        label,
      })),
      match: (u, v) => u.roles.includes(v as Role),
    },
  ];

  return (
    <AppShell allowedRoles={["admin"]} title="Users" description="Every account on the Agribridge marketplace.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UsersIcon} title="Total users" value={users.length} tone="brand" />
        <StatCard
          icon={Sprout}
          title="Farmers"
          value={users.filter((u) => u.roles.includes("farmer")).length}
          tone="soft"
        />
        <StatCard
          icon={ShoppingBasket}
          title="Buyers"
          value={users.filter((u) => u.roles.includes("buyer")).length}
          tone="soft"
        />
        <StatCard
          icon={Package}
          title="Suppliers"
          value={users.filter((u) => u.roles.includes("supplier")).length}
          tone="soft"
        />
      </div>

      <DataTable
        rows={users}
        columns={columns}
        getRowId={(u) => u.id}
        searchFields={(u) => `${u.name} ${u.phone}`}
        filters={filters}
        exportFileName="users"
        paginate
        searchPlaceholder="Search by name or phone…"
      />
    </AppShell>
  );
}
