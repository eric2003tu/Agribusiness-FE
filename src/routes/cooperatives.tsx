import { useState } from "react";
import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { Building2, Handshake, MapPinned, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/user-avatar";
import { DataTable, type Column, type FilterConfig } from "@/components/data-table";
import { useWorkspace } from "@/lib/workspace-store";
import { ORGANIZATION_TYPE_LABELS, locationById, type Cooperative } from "@/lib/mock-data";

export const Route = createFileRoute("/cooperatives")({
  head: () => ({
    meta: [
      { title: "Cooperatives — Agribridge" },
      {
        name: "description",
        content: "Registered farming cooperatives, their districts and member endorsements.",
      },
    ],
  }),
  component: CooperativesPage,
});

function CooperativesPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { cooperatives, users, endorsements, userById, addEndorsement } = useWorkspace();
  const unverifiedFarmers = users.filter((u) => u.roles.includes("farmer") && !u.isVerified);
  const [endorsedId, setEndorsedId] = useState(unverifiedFarmers[0]?.id ?? "");
  const [note, setNote] = useState("");

  if (pathname !== "/cooperatives") {
    return <Outlet />;
  }

  const membersOf = (coopId: string) => users.filter((u) => u.cooperativeId === coopId);
  const totalMembers = users.filter((u) => u.cooperativeId).length;
  const districtsCovered = new Set(cooperatives.map((c) => c.districtId)).size;

  const columns: Column<Cooperative>[] = [
    {
      key: "name",
      header: "Cooperative",
      render: (c) => (
        <div>
          <p className="font-medium text-foreground">{c.name}</p>
          <p className="text-xs text-muted-foreground">{c.registrationNumber}</p>
        </div>
      ),
      exportValue: (c) => c.name,
    },
    {
      key: "type",
      header: "Type",
      render: (c) => <Badge variant="secondary">{ORGANIZATION_TYPE_LABELS[c.organizationType]}</Badge>,
      exportValue: (c) => ORGANIZATION_TYPE_LABELS[c.organizationType],
    },
    {
      key: "district",
      header: "District",
      render: (c) => locationById(c.districtId)?.name ?? "—",
      exportValue: (c) => locationById(c.districtId)?.name ?? "",
    },
    {
      key: "members",
      header: "Members",
      render: (c) => {
        const members = membersOf(c.id);
        return (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {members.slice(0, 4).map((m) => (
                <UserAvatar key={m.id} user={m} className="size-7 border-2 border-card text-[10px]" />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">{members.length}</span>
          </div>
        );
      },
      exportValue: (c) => membersOf(c.id).length,
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <Button asChild size="sm" variant="outline">
          <Link to="/cooperatives/$cooperativeId" params={{ cooperativeId: c.id }}>
            View
          </Link>
        </Button>
      ),
      exportValue: () => "",
    },
  ];

  const filters: FilterConfig<Cooperative>[] = [
    {
      key: "type",
      label: "Type",
      options: Object.entries(ORGANIZATION_TYPE_LABELS).map(([value, label]) => ({ value, label })),
      match: (c, v) => c.organizationType === v,
    },
    {
      key: "district",
      label: "District",
      options: [...new Set(cooperatives.map((c) => c.districtId))].map((id) => ({
        value: id,
        label: locationById(id)?.name ?? id,
      })),
      match: (c, v) => c.districtId === v,
    },
  ];

  return (
    <AppShell
      allowedRoles={["admin"]}
      title="Cooperatives"
      description="Registered farmer cooperatives integrated with the platform."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} title="Cooperatives" value={cooperatives.length} tone="brand" />
        <StatCard icon={Users} title="Total members" value={totalMembers} tone="success" />
        <StatCard icon={MapPinned} title="Districts covered" value={districtsCovered} tone="soft" />
        <StatCard icon={Handshake} title="Endorsements" value={endorsements.length} tone="warning" />
      </div>

      <DataTable
        rows={cooperatives}
        columns={columns}
        getRowId={(c) => c.id}
        searchFields={(c) => `${c.name} ${c.registrationNumber} ${locationById(c.districtId)?.name ?? ""}`}
        filters={filters}
        exportFileName="cooperatives"
        paginate
        searchPlaceholder="Search by name, registration number or district…"
        emptyMessage="No cooperatives registered yet."
      />

      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Community endorsements</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Cooperative leaders vouching for new farmers to solve the cold-start trust problem.
        </p>
        <ul className="mt-3 divide-y divide-border">
          {endorsements.length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">No endorsements yet.</li>
          )}
          {endorsements.map((e) => (
            <li key={e.id} className="py-3 text-sm">
              <span className="font-medium text-foreground">{userById(e.endorserId)?.name}</span>{" "}
              vouched for{" "}
              <span className="font-medium text-foreground">{userById(e.endorsedId)?.name}</span>
              <p className="mt-1 text-xs text-muted-foreground">{e.note}</p>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div className="grid gap-2">
            <label className="text-xs text-muted-foreground">Vouch for a farmer</label>
            <Select value={endorsedId} onValueChange={setEndorsedId}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unverifiedFarmers.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Why are you vouching for them?"
            className="min-w-[16rem] flex-1"
            rows={1}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            disabled={!endorsedId || !note.trim()}
            onClick={() => {
              addEndorsement({ endorsedId, note });
              setNote("");
            }}
          >
            Add endorsement
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
