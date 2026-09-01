import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, Eye, Plus, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { DataTable, type Column, type FilterConfig } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/lib/workspace-store";
import type { University } from "@/lib/mock-data";

export const Route = createFileRoute("/universities")({
  head: () => ({
    meta: [
      { title: "Universities — TaskFlow" },
      {
        name: "description",
        content: "Create and provision new universities, each fully isolated with its own admin.",
      },
    ],
  }),
  component: Universities,
});

function Universities() {
  const {
    universities,
    principalForUniversity,
    memberCountForUniversity,
    createUniversity,
    viewUniversity,
  } = useWorkspace();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [principalEmail, setPrincipalEmail] = useState("");

  const totalPeople = universities.reduce((sum, u) => sum + memberCountForUniversity(u.id), 0);

  const submit = () => {
    if (!name.trim() || !principalName.trim() || !principalEmail.trim()) {
      return;
    }
    createUniversity({
      name: name.trim(),
      adminName: principalName.trim(),
      adminEmail: principalEmail,
    });
    setName("");
    setPrincipalName("");
    setPrincipalEmail("");
    setOpen(false);
  };

  const columns: Array<Column<University>> = [
    { key: "name", header: "University", render: (u) => u.name, exportValue: (u) => u.name },
    {
      key: "principal",
      header: "Principal",
      render: (u) => {
        const principal = principalForUniversity(u.id);
        if (!principal)
          return <span className="text-sm text-muted-foreground">No principal yet</span>;
        return (
          <div>
            <p className="text-sm font-medium text-foreground">{principal.name}</p>
            <p className="text-xs text-muted-foreground">{principal.email}</p>
          </div>
        );
      },
      exportValue: (u) => principalForUniversity(u.id)?.email ?? "",
    },
    {
      key: "members",
      header: "People",
      render: (u) => memberCountForUniversity(u.id),
      exportValue: (u) => memberCountForUniversity(u.id),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (u) => u.createdAt,
      exportValue: (u) => u.createdAt,
    },
    {
      key: "actions",
      header: "",
      render: (u) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            viewUniversity(u.id);
            void navigate({ to: "/dashboard" });
          }}
        >
          <Eye className="size-3.5" /> Manage
        </Button>
      ),
      exportValue: () => "",
    },
  ];

  const filters: Array<FilterConfig<University>> = [
    {
      key: "principal",
      label: "Principal",
      options: [
        { value: "has", label: "Has principal" },
        { value: "none", label: "No principal" },
      ],
      match: (u, v) =>
        v === "has" ? !!principalForUniversity(u.id) : !principalForUniversity(u.id),
    },
  ];

  return (
    <AppShell
      allowedRoles={["admin"]}
      title="Universities"
      description="Provision a new university and its first principal. Each one is fully isolated."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New university</DialogTitle>
              <DialogDescription>
                Creates the university and its first principal account. The principal signs in with
                the shared demo password.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="uni-name">University name</Label>
                <Input id="uni-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uni-principal-name">Principal name</Label>
                <Input
                  id="uni-principal-name"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uni-principal-email">Principal email</Label>
                <Input
                  id="uni-principal-email"
                  type="email"
                  value={principalEmail}
                  onChange={(e) => setPrincipalEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit}>Create university</Button>
            </DialogFooter>
          </DialogContent>
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New university
          </Button>
        </Dialog>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} title="Universities" value={universities.length} tone="brand" />
        <StatCard icon={Users} title="People across the platform" value={totalPeople} tone="soft" />
      </div>
      <DataTable
        rows={universities}
        columns={columns}
        getRowId={(u) => u.id}
        searchFields={(u) => `${u.name} ${principalForUniversity(u.id)?.email ?? ""}`}
        filters={filters}
        exportFileName="universities"
        emptyMessage="No universities yet."
      />
    </AppShell>
  );
}
