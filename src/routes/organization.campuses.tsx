import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Building2, ChevronRight, GraduationCap, Plus, UserCog } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { OrgUnitTable } from "@/components/org-unit-table";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/lib/workspace-store";
import type { OrgUnitType } from "@/lib/mock-data";

export const Route = createFileRoute("/organization/campuses")({
  head: () => ({
    meta: [
      { title: "Campuses & colleges — TaskFlow" },
      {
        name: "description",
        content:
          "Manage your university's campuses and colleges — drill into each to build it out.",
      },
    ],
  }),
  component: Campuses,
});

function Campuses() {
  const { orgUnits, universities, effectiveUniversityId, addOrgUnit } = useWorkspace();
  const [addType, setAddType] = useState<OrgUnitType | null>(null);
  const [name, setName] = useState("");

  const university = universities.find((u) => u.id === effectiveUniversityId);
  const campuses = orgUnits.filter((u) => u.type === "campus");
  const colleges = orgUnits.filter((u) => u.type === "college");
  const managedColleges = colleges.filter((c) => c.managerId).length;
  const schoolsAndCenters = orgUnits.filter(
    (u) => u.type === "school" || u.type === "center",
  ).length;

  const submit = () => {
    if (!addType || !name.trim()) return;
    addOrgUnit({ type: addType, name: name.trim(), parentId: null });
    setName("");
    setAddType(null);
  };

  return (
    <AppShell
      allowedRoles={["admin", "principal"]}
      title={university?.name ?? "Campuses & Colleges"}
      description="Campuses and colleges. Manage a unit to build out what's beneath it."
    >
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/organization" className="hover:text-foreground hover:underline">
          Unit management
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-foreground">
          {university?.name ?? "Campuses & Colleges"}
        </span>
      </nav>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} title="Campuses" value={campuses.length} tone="brand" />
        <StatCard icon={GraduationCap} title="Colleges" value={colleges.length} tone="soft" />
        <StatCard
          icon={UserCog}
          title="Colleges with a principal"
          value={managedColleges}
          tone={managedColleges < colleges.length ? "warning" : "success"}
        />
        <StatCard
          icon={Building2}
          title="Schools & centers"
          value={schoolsAndCenters}
          tone="success"
        />
      </div>

      <Tabs defaultValue="campuses">
        <TabsList>
          <TabsTrigger value="campuses">Campuses</TabsTrigger>
          <TabsTrigger value="colleges">Colleges</TabsTrigger>
        </TabsList>

        <TabsContent value="campuses" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Physical locations. Campuses don't have sub-units — just people and an owner.
            </p>
            <Button
              size="sm"
              onClick={() => {
                setAddType("campus");
                setName("");
              }}
            >
              <Plus className="size-3.5" /> Add Campus
            </Button>
          </div>
          <OrgUnitTable
            units={campuses}
            emptyMessage="No campuses yet."
            exportFileName="campuses"
          />
        </TabsContent>

        <TabsContent value="colleges" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Academic units. Manage a college to see its schools and centers.
            </p>
            <Button
              size="sm"
              onClick={() => {
                setAddType("college");
                setName("");
              }}
            >
              <Plus className="size-3.5" /> Add College
            </Button>
          </div>
          <OrgUnitTable
            units={colleges}
            emptyMessage="No colleges yet."
            exportFileName="colleges"
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!addType} onOpenChange={(o) => !o && setAddType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New {addType === "campus" ? "Campus" : "College"}</DialogTitle>
            <DialogDescription>Name this unit.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="new-top-unit-name">Name</Label>
            <Input id="new-top-unit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddType(null)}>
              Cancel
            </Button>
            <Button onClick={submit}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
