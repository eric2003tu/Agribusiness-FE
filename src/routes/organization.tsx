import { useState } from "react";
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { Building2, Plus, Settings2, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace-store";
import { INSTITUTION_TYPE_LABELS, type InstitutionType, type University } from "@/lib/mock-data";

export const Route = createFileRoute("/organization")({
  head: () => ({
    meta: [
      { title: "Unit management — TaskFlow" },
      {
        name: "description",
        content: "Your institution. Manage it to see its campuses and colleges.",
      },
    ],
  }),
  component: Organization,
});

function Organization() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { universities, orgUnits, effectiveUniversityId, createUniversity } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<InstitutionType>("institution");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  if (pathname !== "/organization") {
    return <Outlet />;
  }

  const institutions = universities.filter((u) => u.id === effectiveUniversityId);
  const campuses = orgUnits.filter((u) => u.type === "campus").length;
  const colleges = orgUnits.filter((u) => u.type === "college").length;

  const resetForm = () => {
    setType("institution");
    setName("");
    setCode("");
    setDescription("");
    setActive(true);
    setAdminName("");
    setAdminEmail("");
  };

  const submit = () => {
    if (!name.trim() || !adminName.trim() || !adminEmail.trim()) return;
    createUniversity({
      name: name.trim(),
      type,
      code: code.trim(),
      description: description.trim(),
      active,
      adminName: adminName.trim(),
      adminEmail,
    });
    resetForm();
    setOpen(false);
  };

  const columns: Array<Column<University>> = [
    {
      key: "name",
      header: "Institution",
      render: (u) => (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{INSTITUTION_TYPE_LABELS[u.type]}</Badge>
          <span className="font-medium text-foreground">{u.name}</span>
        </div>
      ),
      exportValue: (u) => u.name,
    },
    {
      key: "status",
      header: "Status",
      render: (u) =>
        u.active ? (
          <Badge variant="secondary" className="bg-success/12 text-success">
            Active
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            Inactive
          </Badge>
        ),
      exportValue: (u) => (u.active ? "Active" : "Inactive"),
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
      className: "w-40",
      render: () => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/organization/campuses" })}
          >
            <Settings2 className="size-3.5" /> Manage
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <AppShell
      allowedRoles={["admin", "principal"]}
      title="Unit management"
      description="Your institution. Manage it to see its campuses and colleges."
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Add Institution
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Building2} title="Institutions" value={institutions.length} tone="brand" />
        <StatCard icon={Building2} title="Campuses" value={campuses} tone="soft" />
        <StatCard icon={Users} title="Colleges" value={colleges} tone="success" />
      </div>

      <DataTable
        rows={institutions}
        columns={columns}
        getRowId={(u) => u.id}
        searchFields={(u) => u.name}
        exportFileName="institutions"
        emptyMessage="No institution yet."
      />

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="flex max-h-[90vh] flex-col overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Institution</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as InstitutionType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Institution, University, .." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INSTITUTION_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inst-name">Name *</Label>
              <Input
                id="inst-name"
                placeholder="Enter name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inst-code">Code</Label>
              <Input
                id="inst-code"
                placeholder="Enter code (optional)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inst-description">Description</Label>
              <Textarea
                id="inst-description"
                placeholder="Enter description (optional)"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="inst-active" className="cursor-pointer">
                Active
              </Label>
              <Switch id="inst-active" checked={active} onCheckedChange={setActive} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inst-admin-name">Admin name *</Label>
              <Input
                id="inst-admin-name"
                placeholder="Enter admin name"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inst-admin-email">Admin email *</Label>
              <Input
                id="inst-admin-email"
                type="email"
                placeholder="Enter admin email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Create institution</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
