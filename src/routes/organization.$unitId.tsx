import { useState } from "react";
import {
  Building2,
  ChevronRight,
  FolderTree,
  GraduationCap,
  Landmark,
  Plus,
  School,
  Trash2,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { OrgUnitTable } from "@/components/org-unit-table";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { SearchableSelect } from "@/components/searchable-select";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/lib/workspace-store";
import {
  MANAGER_ROLES,
  ORG_UNIT_CHILD_TYPES,
  ORG_UNIT_LABELS,
  ROLE_LABELS,
  type OrgUnit,
  type OrgUnitType,
  type Role,
} from "@/lib/mock-data";

const ASSIGNABLE_ROLES: Role[] = [
  "principal",
  "dean",
  "hod",
  "campus_admin",
  "finance",
  "staff",
  "student",
];

export const Route = createFileRoute("/organization/$unitId")({
  head: () => ({
    meta: [{ title: "Unit management — TaskFlow" }],
  }),
  component: OrgUnitDetail,
});

const UNIT_ICON: Record<OrgUnitType, LucideIcon> = {
  campus: Building2,
  college: GraduationCap,
  school: School,
  center: Landmark,
  department: FolderTree,
};

function OrgUnitDetail() {
  const { unitId } = Route.useParams();
  const navigate = useNavigate();
  const {
    orgUnits,
    members,
    memberById,
    orgUnitById,
    orgUnitPath,
    universities,
    effectiveUniversityId,
    addOrgUnit,
    deleteOrgUnit,
    assignManager,
    addMember,
  } = useWorkspace();

  const [addChildType, setAddChildType] = useState<OrgUnitType | null>(null);
  const [newUnitName, setNewUnitName] = useState("");
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerPick, setManagerPick] = useState("none");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<Role>("staff");
  const [memberUnit, setMemberUnit] = useState<string>(unitId);

  const unit = orgUnitById(unitId);

  if (!unit) {
    return (
      <AppShell
        allowedRoles={["admin", "principal"]}
        title="Not found"
        description="This unit no longer exists."
      >
        <div className="surface-card p-10 text-center">
          <p className="text-sm text-muted-foreground">It may have been deleted.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/organization/campuses" })}>
            Back to campuses & colleges
          </Button>
        </div>
      </AppShell>
    );
  }

  const university = universities.find((u) => u.id === effectiveUniversityId);
  const path = orgUnitPath(unitId);
  const ancestors = path.slice(0, -1);
  const directMembers = members.filter((m) => m.orgUnitId === unit.id);
  const manager = memberById(unit.managerId);
  const managers = members.filter((m) => MANAGER_ROLES.includes(m.role));
  const childTypes = ORG_UNIT_CHILD_TYPES[unit.type];

  const unitOptions = orgUnits.map((u) => ({
    value: u.id,
    label: `${ORG_UNIT_LABELS[u.type]}: ${u.name}`,
    keywords: u.name,
  }));

  const submitChild = () => {
    if (!addChildType || !newUnitName.trim()) return;
    addOrgUnit({ type: addChildType, name: newUnitName.trim(), parentId: unit.id });
    setNewUnitName("");
    setAddChildType(null);
  };

  const submitManager = () => {
    assignManager(unit.id, managerPick === "none" ? null : managerPick);
    setManagerOpen(false);
  };

  const submitMember = () => {
    if (!memberName.trim() || !memberEmail.trim()) return;
    addMember({
      name: memberName.trim(),
      email: memberEmail,
      role: memberRole,
      orgUnitId: memberUnit === "none" ? null : memberUnit,
    });
    setMemberOpen(false);
    setMemberName("");
    setMemberEmail("");
    setMemberRole("staff");
    setMemberUnit(unit.id);
  };

  return (
    <AppShell
      allowedRoles={["admin", "principal"]}
      title={unit.name}
      description={
        ancestors.length > 0 ? ancestors.map((u) => u.name).join(" / ") : "Top-level unit"
      }
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setMemberOpen(true)}>
            <Users className="size-4" /> New member
          </Button>
          <Button variant="outline" onClick={() => setManagerOpen(true)}>
            <UserCog className="size-4" /> {manager ? "Change manager" : "Assign manager"}
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      }
    >
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/organization" className="hover:text-foreground hover:underline">
          Unit management
        </Link>
        <ChevronRight className="size-3.5" />
        <Link to="/organization/campuses" className="hover:text-foreground hover:underline">
          {university?.name ?? "Campuses & Colleges"}
        </Link>
        {path.map((u, i) => (
          <span key={u.id} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5" />
            {i === path.length - 1 ? (
              <span className="font-medium text-foreground">{u.name}</span>
            ) : (
              <Link
                to="/organization/$unitId"
                params={{ unitId: u.id }}
                className="hover:text-foreground hover:underline"
              >
                {u.name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={UNIT_ICON[unit.type]}
          title="Type"
          value={ORG_UNIT_LABELS[unit.type]}
          tone="brand"
        />
        {manager ? (
          <Link to="/member/$memberId" params={{ memberId: manager.id }} className="block">
            <StatCard
              icon={UserCog}
              title="Manager"
              value={manager.name}
              hint={manager.email}
              tone="success"
            />
          </Link>
        ) : (
          <StatCard icon={UserCog} title="Manager" value="Unassigned" tone="warning" />
        )}
        <StatCard icon={Users} title="People here" value={directMembers.length} tone="soft" />
      </div>

      {childTypes.length === 1 && (
        <ChildSection
          unit={unit}
          childType={childTypes[0]!}
          orgUnits={orgUnits}
          onAdd={(type) => {
            setAddChildType(type);
            setNewUnitName("");
          }}
        />
      )}

      {childTypes.length > 1 && (
        <Tabs defaultValue={childTypes[0]!}>
          <TabsList>
            {childTypes.map((type) => (
              <TabsTrigger key={type} value={type}>
                {ORG_UNIT_LABELS[type]}s
              </TabsTrigger>
            ))}
          </TabsList>
          {childTypes.map((type) => (
            <TabsContent key={type} value={type} className="mt-4">
              <ChildSection
                unit={unit}
                childType={type}
                orgUnits={orgUnits}
                onAdd={(t) => {
                  setAddChildType(t);
                  setNewUnitName("");
                }}
                hideHeading
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={!!addChildType} onOpenChange={(o) => !o && setAddChildType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New {addChildType ? ORG_UNIT_LABELS[addChildType] : ""}</DialogTitle>
            <DialogDescription>Name this unit.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="child-name">Name</Label>
            <Input
              id="child-name"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddChildType(null)}>
              Cancel
            </Button>
            <Button onClick={submitChild}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={managerOpen} onOpenChange={setManagerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign manager — {unit.name}</DialogTitle>
            <DialogDescription>
              This person manages everyone in this unit and everything beneath it.
            </DialogDescription>
          </DialogHeader>
          <Select
            value={managerPick === "none" ? (unit.managerId ?? "none") : managerPick}
            onValueChange={setManagerPick}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No manager</SelectItem>
              {managers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManagerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitManager}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${unit.name}?`}
        description="Its sub-units and people must be moved or removed first."
        onConfirm={() => {
          deleteOrgUnit(unit.id);
          setDeleteOpen(false);
          const parent = ancestors[ancestors.length - 1];
          if (parent) {
            navigate({ to: "/organization/$unitId", params: { unitId: parent.id } });
          } else {
            navigate({ to: "/organization/campuses" });
          }
        }}
      />

      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New member</DialogTitle>
            <DialogDescription>Signs in with the shared demo password.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="member-name">Name</Label>
              <Input
                id="member-name"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={memberRole} onValueChange={(v) => setMemberRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Org unit</Label>
              <SearchableSelect
                value={memberUnit}
                onValueChange={setMemberUnit}
                placeholder="Select a unit..."
                searchPlaceholder="Search campus, college, school, department..."
                emptyMessage="No units found."
                options={[
                  { value: "none", label: "None (directly under the university)" },
                  ...unitOptions,
                ]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitMember}>Add member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ChildSection({
  unit,
  childType,
  orgUnits,
  onAdd,
  hideHeading = false,
}: {
  unit: OrgUnit;
  childType: OrgUnitType;
  orgUnits: OrgUnit[];
  onAdd: (type: OrgUnitType) => void;
  hideHeading?: boolean;
}) {
  const children = orgUnits.filter((u) => u.parentId === unit.id && u.type === childType);
  const label = ORG_UNIT_LABELS[childType];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {!hideHeading && (
          <h2 className="text-sm font-semibold text-foreground">
            {label}s in {unit.name}
          </h2>
        )}
        <Button
          size="sm"
          className={hideHeading ? "ml-auto" : undefined}
          onClick={() => onAdd(childType)}
        >
          <Plus className="size-3.5" /> Add {label}
        </Button>
      </div>
      <OrgUnitTable
        units={children}
        emptyMessage={`No ${label.toLowerCase()}s yet.`}
        exportFileName={`${label.toLowerCase()}s`}
      />
    </div>
  );
}
