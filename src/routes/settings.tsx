import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Clock, Settings2, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useWorkspace } from "@/lib/workspace-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — TaskFlow" },
      {
        name: "description",
        content:
          "Configure your organization name, working hours and idle-time alerts in TaskFlow.",
      },
      { property: "og:title", content: "Settings — TaskFlow" },
      { property: "og:description", content: "Organization, working hours and idle alerts." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { members, tasks } = useWorkspace();
  const [org, setOrg] = useState("TaskFlow Organization");
  const [hours, setHours] = useState("40");
  const [idleAlerts, setIdleAlerts] = useState(true);
  const [autoReassign, setAutoReassign] = useState(false);

  return (
    <AppShell
      allowedRoles={["admin", "principal"]}
      title="Settings"
      description="Organization-wide preferences for planning and alerts."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Settings2} title="Organization" value={org} tone="brand" hint="Org name" />
        <StatCard
          icon={Users}
          title="Team size"
          value={members.length}
          tone="soft"
          hint="Members"
        />
        <StatCard
          icon={Clock}
          title="Weekly hours"
          value={`${hours}h`}
          tone="success"
          hint="Default capacity"
        />
        <StatCard
          icon={ShieldCheck}
          title="Active tasks"
          value={tasks.filter((t) => t.status !== "completed").length}
          tone="warning"
          hint="Across the team"
        />
      </div>
      <div className="surface-card max-w-2xl p-6">
        <h2 className="text-sm font-semibold text-foreground">Organization</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="org">Name</Label>
            <Input id="org" value={org} onChange={(e) => setOrg(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hours">Default weekly hours</Label>
            <Input
              id="hours"
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
        </div>

        <Separator className="my-6" />

        <h2 className="text-sm font-semibold text-foreground">Idle-time monitoring</h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Idle worker alerts</p>
              <p className="text-xs text-muted-foreground">
                Notify managers when someone has no task in progress.
              </p>
            </div>
            <Switch checked={idleAlerts} onCheckedChange={setIdleAlerts} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Suggest auto-reassignment</p>
              <p className="text-xs text-muted-foreground">
                Recommend backlog tasks for idle team members.
              </p>
            </div>
            <Switch checked={autoReassign} onCheckedChange={setAutoReassign} />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button
            onClick={() => {
              if (!org.trim()) {
                toast.error("Organization name is required");
                return;
              }
              toast.success("Settings saved", { description: "Your preferences were updated." });
            }}
          >
            Save changes
          </Button>
          <Button variant="outline" onClick={() => toast.info("Changes discarded")}>
            Reset
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
