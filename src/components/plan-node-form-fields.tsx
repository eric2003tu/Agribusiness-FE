import { SearchableSelect } from "@/components/searchable-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace-store";
import {
  ORG_UNIT_LABELS,
  PLAN_NODE_STATUS_LABELS,
  PRIORITY_LABELS,
  type PlanNodeStatus,
  type PlanNodeType,
} from "@/lib/mock-data";
import type { Priority } from "@/lib/mock-data";

export interface PlanNodeFormState {
  title: string;
  description: string;
  responsibleUnitId: string; // "none" = unset
  ownerId: string; // "none" = unset
  indicator: string;
  baseline: string;
  target: string;
  strategicPillar: string;
  planningPeriod: string;
  sourceOfVerification: string;
  location: string;
  startDate: string;
  completionDate: string;
  priority: Priority;
  status: PlanNodeStatus;
}

export const EMPTY_PLAN_NODE_FORM: PlanNodeFormState = {
  title: "",
  description: "",
  responsibleUnitId: "none",
  ownerId: "none",
  indicator: "",
  baseline: "",
  target: "",
  strategicPillar: "",
  planningPeriod: "",
  sourceOfVerification: "",
  location: "",
  startDate: "",
  completionDate: "",
  priority: "medium",
  status: "not_started",
};

/** "Responsible officer" for objectives, "Activity manager" for Activity, no owner field for Output. */
const OWNER_LABEL: Record<PlanNodeType, string | null> = {
  strategic_objective: "Responsible officer",
  unit_objective: "Responsible officer",
  specific_objective: "Responsible officer",
  output: null,
  activity: "Activity manager",
};

export function PlanNodeFormFields({
  type,
  value,
  onChange,
}: {
  type: PlanNodeType;
  value: PlanNodeFormState;
  onChange: (next: PlanNodeFormState) => void;
}) {
  const { orgUnits, members } = useWorkspace();
  const ownerLabel = OWNER_LABEL[type];
  const showIndicatorTarget = type !== "activity";
  const showBaseline = type !== "output" && type !== "activity";
  const showStrategicFields = type === "strategic_objective";
  const showActivityFields = type === "activity";

  // An Activity's responsible unit is always a School — that's what makes the
  // Dean → HOD → lecturer task-assignment chain (and the budget/material
  // approval chains rooted from it) resolve to someone real. Objectives and
  // Outputs can reasonably sit at any org level, so only Activities are
  // restricted here.
  const unitOptions = orgUnits
    .filter((u) => type !== "activity" || u.type === "school")
    .map((u) => ({
      value: u.id,
      label: `${ORG_UNIT_LABELS[u.type]}: ${u.name}`,
      keywords: u.name,
    }));
  const ownerOptions = members.map((m) => ({
    value: m.id,
    label: m.name,
    keywords: `${m.name} ${m.title} ${m.role}`,
  }));

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>Title</Label>
        <Input
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Description</Label>
        <Textarea
          rows={3}
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>{type === "activity" ? "Responsible school *" : "Responsible unit"}</Label>
        <SearchableSelect
          value={value.responsibleUnitId}
          onValueChange={(v) => onChange({ ...value, responsibleUnitId: v })}
          placeholder={type === "activity" ? "Select a school..." : "Select a unit..."}
          searchPlaceholder={
            type === "activity"
              ? "Search schools..."
              : "Search campus, college, school, department..."
          }
          emptyMessage={type === "activity" ? "No schools found." : "No units found."}
          options={
            type === "activity" ? unitOptions : [{ value: "none", label: "None" }, ...unitOptions]
          }
        />
        {type === "activity" && (
          <p className="text-xs text-muted-foreground">
            The Dean of this school will assign the activity's tasks to departments and lecturers.
          </p>
        )}
      </div>
      {ownerLabel && (
        <div className="grid gap-2">
          <Label>{ownerLabel}</Label>
          <SearchableSelect
            value={value.ownerId}
            onValueChange={(v) => onChange({ ...value, ownerId: v })}
            placeholder="Select a person..."
            searchPlaceholder="Search by name..."
            emptyMessage="No members found."
            options={[{ value: "none", label: "None" }, ...ownerOptions]}
          />
        </div>
      )}
      {showIndicatorTarget && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Indicator</Label>
            <Input
              value={value.indicator}
              onChange={(e) => onChange({ ...value, indicator: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Target</Label>
            <Input
              value={value.target}
              onChange={(e) => onChange({ ...value, target: e.target.value })}
            />
          </div>
        </div>
      )}
      {showBaseline && (
        <div className="grid gap-2">
          <Label>Baseline</Label>
          <Input
            value={value.baseline}
            onChange={(e) => onChange({ ...value, baseline: e.target.value })}
          />
        </div>
      )}
      {showStrategicFields && (
        <>
          <div className="grid gap-2">
            <Label>Strategic pillar / programme</Label>
            <Input
              value={value.strategicPillar}
              onChange={(e) => onChange({ ...value, strategicPillar: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Planning period</Label>
              <Input
                placeholder="e.g. 2026/2027"
                value={value.planningPeriod}
                onChange={(e) => onChange({ ...value, planningPeriod: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Source of verification</Label>
              <Input
                value={value.sourceOfVerification}
                onChange={(e) => onChange({ ...value, sourceOfVerification: e.target.value })}
              />
            </div>
          </div>
        </>
      )}
      {showActivityFields && (
        <>
          <div className="grid gap-2">
            <Label>Location</Label>
            <Input
              value={value.location}
              onChange={(e) => onChange({ ...value, location: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={value.startDate}
                onChange={(e) => onChange({ ...value, startDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Completion date</Label>
              <Input
                type="date"
                value={value.completionDate}
                onChange={(e) => onChange({ ...value, completionDate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select
                value={value.priority}
                onValueChange={(v) => onChange({ ...value, priority: v as Priority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={value.status}
                onValueChange={(v) => onChange({ ...value, status: v as PlanNodeStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLAN_NODE_STATUS_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
