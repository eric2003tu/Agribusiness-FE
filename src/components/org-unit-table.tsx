import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Pencil, Settings2 } from "lucide-react";
import { DataTable, type Column, type FilterConfig } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
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
import { UserAvatar } from "@/components/user-avatar";
import { useWorkspace } from "@/lib/workspace-store";
import { ORG_UNIT_CHILD_TYPES, ORG_UNIT_LABELS, type OrgUnit } from "@/lib/mock-data";

interface OrgUnitTableProps {
  units: OrgUnit[];
  emptyMessage: string;
  exportFileName?: string;
}

export function OrgUnitTable({
  units,
  emptyMessage,
  exportFileName = "org-units",
}: OrgUnitTableProps) {
  const { orgUnits, members, memberById, renameOrgUnit } = useWorkspace();
  const navigate = useNavigate();
  const [editTarget, setEditTarget] = useState<OrgUnit | null>(null);
  const [editName, setEditName] = useState("");

  const submitEdit = () => {
    if (!editTarget || !editName.trim()) return;
    renameOrgUnit(editTarget.id, editName.trim());
    setEditTarget(null);
  };

  const columns: Array<Column<OrgUnit>> = [
    {
      key: "name",
      header: "Name",
      render: (u) => (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{ORG_UNIT_LABELS[u.type]}</Badge>
          <span className="font-medium text-foreground">{u.name}</span>
        </div>
      ),
      exportValue: (u) => u.name,
    },
    {
      key: "manager",
      header: "Manager",
      render: (u) => {
        const manager = memberById(u.managerId);
        if (!manager) return <span className="text-sm text-muted-foreground">No manager</span>;
        return (
          <div className="flex items-center gap-2">
            <UserAvatar member={manager} className="size-6" />
            <span className="text-sm">{manager.name}</span>
          </div>
        );
      },
      exportValue: (u) => memberById(u.managerId)?.name ?? "",
    },
    {
      key: "people",
      header: "People",
      render: (u) => members.filter((m) => m.orgUnitId === u.id).length,
      exportValue: (u) => members.filter((m) => m.orgUnitId === u.id).length,
    },
    {
      key: "subunits",
      header: "Sub-units",
      render: (u) => orgUnits.filter((o) => o.parentId === u.id).length,
      exportValue: (u) => orgUnits.filter((o) => o.parentId === u.id).length,
    },
    {
      key: "status",
      header: "Status",
      render: () => (
        <Badge variant="secondary" className="bg-success/12 text-success">
          Active
        </Badge>
      ),
      exportValue: () => "Active",
    },
    {
      key: "actions",
      header: "",
      className: "w-56",
      render: (u) => {
        const childTypes = ORG_UNIT_CHILD_TYPES[u.type];
        return (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {childTypes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: "/organization/$unitId", params: { unitId: u.id } })}
              >
                <Settings2 className="size-3.5" /> Manage{" "}
                {ORG_UNIT_LABELS[childTypes[0]!].toLowerCase()}s
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditTarget(u);
                setEditName(u.name);
              }}
            >
              <Pencil className="size-3.5" /> Edit
            </Button>
          </div>
        );
      },
      exportValue: () => "",
    },
  ];

  const filters: Array<FilterConfig<OrgUnit>> = [
    {
      key: "manager",
      label: "Manager",
      options: [
        { value: "has", label: "Has manager" },
        { value: "none", label: "No manager" },
      ],
      match: (u, v) => (v === "has" ? !!u.managerId : !u.managerId),
    },
  ];

  return (
    <>
      <DataTable
        rows={units}
        columns={columns}
        getRowId={(u) => u.id}
        searchFields={(u) => u.name}
        filters={filters}
        exportFileName={exportFileName}
        emptyMessage={emptyMessage}
      />

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {editTarget ? ORG_UNIT_LABELS[editTarget.type] : ""}</DialogTitle>
            <DialogDescription>Update this unit's name.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="edit-unit-name">Name</Label>
            <Input
              id="edit-unit-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
