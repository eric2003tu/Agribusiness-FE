import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { authenticate, SESSION_STORAGE_KEY } from "./auth";
import {
  members as seedMembers,
  tasks as seedTasks,
  seedActivity,
  universities as seedUniversities,
  orgUnits as seedOrgUnits,
  planNodes as seedPlanNodes,
  budgets as seedBudgets,
  procurementItems as seedProcurementItems,
  requisitions as seedRequisitions,
  materialRequests as seedMaterialRequests,
  ACTIVE_WINDOW_MIN,
  APPROVAL_STEP_LABELS,
  IDLE_WINDOW_MIN,
  MANAGER_ROLES,
  STALLED_DAYS,
  type ActivityLog,
  type ApprovalStepRole,
  type Budget,
  type BudgetStatus,
  type BudgetApprovalStep,
  type BudgetEvent,
  type InstitutionType,
  type MaterialRequest,
  type MaterialRequestItem,
  type MaterialRequestStatus,
  type MaterialRequestStep,
  type MaterialRequestEvent,
  type Member,
  type MemberHrFields,
  type OrgUnit,
  type OrgUnitType,
  type PlanNode,
  type PlanNodeType,
  type PlanNodeStatus,
  type PresenceStatus,
  type Priority,
  type ProcurementItem,
  type ProcurementMethod,
  type ProcurementStatus,
  type Requisition,
  type Role,
  type Task,
  type TaskStatus,
  type University,
} from "./mock-data";

const ADMIN_VIEWING_STORAGE_KEY = "taskflow.admin.viewingUniversityId";

type Ability = "manageTasks" | "manageTeam" | "viewAll";

export interface MemberStats {
  member: Member;
  totalTasks: number;
  openTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  loadPercent: number;
  hoursRemaining: number;
  /** True when the member has been assigned zero open tasks (a workload signal). */
  hasNoOpenTasks: boolean;
  /** Presence derived from lastActiveAt — real activity, not workload. */
  presence: PresenceStatus;
  minutesSinceActive: number;
  lastActiveAt: string;
  /** @deprecated kept for existing call sites — now presence-based (presence !== "active"). */
  isIdle: boolean;
  lastActivity: ActivityLog | null;
}

export interface TaskFlags {
  overdue: boolean;
  stalled: boolean;
  overBudget: boolean;
}

interface WorkspaceContextValue {
  members: Member[];
  tasks: Task[];
  activity: ActivityLog[];
  universities: University[];
  orgUnits: OrgUnit[];
  currentUser: Member;
  session: Member | null;
  ready: boolean;
  signIn: (email: string, password: string) => { ok: boolean; error?: string };
  signOut: () => void;
  setCurrentUserId: (id: string) => void;
  visibleTasks: Task[];
  addTask: (task: Omit<Task, "id" | "createdAt" | "loggedHours" | "universityId">) => void;
  updateTask: (id: string, fields: Partial<Omit<Task, "id" | "createdAt">>) => void;
  updateTaskStatus: (ids: string[], status: TaskStatus) => void;
  reassignTasks: (ids: string[], assigneeId: string | null) => void;
  deleteTasks: (ids: string[]) => void;
  memberById: (id: string | null) => Member | undefined;
  getMemberStats: (memberId: string) => MemberStats;
  getTaskFlags: (taskId: string) => TaskFlags;
  can: (action: Ability) => boolean;
  orgUnitById: (id: string | null) => OrgUnit | undefined;
  orgUnitPath: (id: string | null) => OrgUnit[];
  /** Provisioning-only lookups for the admin's Universities page — never the full roster. */
  principalForUniversity: (universityId: string) => Member | undefined;
  memberCountForUniversity: (universityId: string) => number;
  /** The university admin is currently "inside" — null means admin sees only /universities. */
  adminViewingUniversityId: string | null;
  /** The university every university-scoped page should treat as "mine" — currentUser.universityId for everyone but admin. */
  effectiveUniversityId: string | null;
  /** Admin-only: enter (or exit, with null) a university to see/manage it in full, like its principal. */
  viewUniversity: (universityId: string | null) => void;
  createUniversity: (input: {
    name: string;
    adminName: string;
    adminEmail: string;
    type?: InstitutionType;
    code?: string;
    description?: string;
    active?: boolean;
  }) => void;
  addOrgUnit: (input: { type: OrgUnitType; name: string; parentId: string | null }) => void;
  renameOrgUnit: (id: string, name: string) => void;
  deleteOrgUnit: (id: string) => void;
  assignManager: (orgUnitId: string, memberId: string | null) => void;
  addMember: (
    input: {
      name: string;
      email: string;
      role: Role;
      orgUnitId: string | null;
      phone?: string;
      title?: string;
      homeCampusId?: string;
    } & Partial<MemberHrFields>,
  ) => void;
  updateMember: (
    id: string,
    fields: Partial<
      Pick<
        Member,
        "name" | "email" | "phone" | "title" | "role" | "orgUnitId" | "actingFor" | "homeCampusId"
      > &
        MemberHrFields
    >,
  ) => void;
  setMemberActive: (id: string, active: boolean) => void;
  deleteMember: (id: string) => void;
  planNodes: PlanNode[];
  planNodeById: (id: string | null) => PlanNode | undefined;
  planNodePath: (id: string | null) => PlanNode[];
  addPlanNode: (input: {
    type: PlanNodeType;
    parentId: string | null;
    title: string;
    description?: string;
    responsibleUnitId?: string | null;
    ownerId?: string | null;
    indicator?: string;
    baseline?: string;
    target?: string;
    strategicPillar?: string;
    planningPeriod?: string;
    sourceOfVerification?: string;
    location?: string;
    startDate?: string;
    completionDate?: string;
    priority?: Priority;
    status?: PlanNodeStatus;
  }) => void;
  updatePlanNode: (
    id: string,
    fields: Partial<Omit<PlanNode, "id" | "universityId" | "type" | "parentId" | "createdAt">>,
  ) => void;
  /** Returns true if the node was actually deleted (false if blocked by children/linked tasks). */
  deletePlanNode: (id: string) => boolean;
  /** Every budget visible to the current user: admin sees all, creators see their own, approvers see it once it has reached (or passed) their step. */
  budgets: Budget[];
  budgetForPlanNode: (planNodeId: string) => Budget | undefined;
  /** The live-resolved approver for a budget's current step (re-resolved from org data, not trusted from the stored snapshot). */
  currentApproverId: (budget: Budget) => string | null;
  submitBudget: (input: {
    planNodeId: string;
    description: string;
    requestedAmount: number;
    currency?: string;
  }) => void;
  decideBudgetStep: (
    budgetId: string,
    decision: "approved" | "rejected" | "queried",
    comment?: string,
  ) => void;
  resubmitBudget: (
    budgetId: string,
    input: { description?: string; requestedAmount?: number; comment: string },
  ) => void;
  setBudgetDisbursed: (budgetId: string, disbursed: boolean) => void;
  /** A lecturer's per-task material + cost plan, climbing HOD -> Dean -> Principal (their own department/school/college). */
  materialRequests: MaterialRequest[];
  materialRequestForTask: (taskId: string) => MaterialRequest | undefined;
  /** The live-resolved approver for a MaterialRequest's current step (mirrors currentApproverId for Budget). */
  currentMaterialRequestApproverId: (request: MaterialRequest) => string | null;
  submitMaterialRequest: (input: {
    taskId: string;
    items: Array<{ item: string; quantity: number; estimatedCost: number }>;
  }) => void;
  decideMaterialRequestStep: (
    id: string,
    decision: "approved" | "rejected" | "queried",
    comment?: string,
  ) => void;
  resubmitMaterialRequest: (
    id: string,
    input: {
      items?: Array<{ item: string; quantity: number; estimatedCost: number }>;
      comment: string;
    },
  ) => void;
  /** Principal-approved only: turns each line into a real ProcurementItem + an immediate Requisition routed to Finance. */
  sendMaterialRequestToProcurement: (
    materialRequestId: string,
    input: {
      method: ProcurementMethod;
      plannedProcurementDate: string;
      requiredDeliveryDate: string;
      fundingSource: string;
    },
  ) => void;
  /** Procurement + Requisitions, visible to admin, the creator, or the manager of the item's responsible unit (and its subtree). */
  procurementItems: ProcurementItem[];
  requisitions: Requisition[];
  /** Sum of approved requisitions against a budget — what's already committed, for "sufficient budget remains" checks. */
  budgetCommitted: (budgetId: string) => number;
  addProcurementItem: (input: {
    budgetId: string;
    item: string;
    specification: string;
    quantity: number;
    estimatedCost: number;
    method: ProcurementMethod;
    plannedProcurementDate: string;
    requiredDeliveryDate: string;
    responsibleUnitId: string | null;
    fundingSource: string;
  }) => void;
  setProcurementStatus: (id: string, status: ProcurementStatus) => void;
  submitRequisition: (input: { procurementItemId: string; amount: number }) => void;
  decideRequisition: (id: string, decision: "approved" | "rejected", comment?: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const ROLE_ABILITIES: Record<Role, Ability[]> = {
  // Only meaningful once admin has selected a university to view — every
  // university-scoped useMemo is empty for admin until then regardless.
  admin: ["manageTasks", "manageTeam", "viewAll"],
  principal: ["manageTasks", "manageTeam", "viewAll"],
  dean: ["manageTasks", "viewAll"],
  hod: ["manageTasks", "viewAll"],
  campus_admin: ["manageTasks", "viewAll"],
  staff: [],
  student: [],
  finance: [],
};

function unitSubtreeIds(rootIds: string[], units: OrgUnit[]): Set<string> {
  const result = new Set<string>();
  const queue = [...rootIds];
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || result.has(id)) continue;
    result.add(id);
    units.filter((u) => u.parentId === id).forEach((u) => queue.push(u.id));
  }
  return result;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [allMembers, setAllMembers] = useState<Member[]>(seedMembers);
  const [allTasks, setAllTasks] = useState<Task[]>(seedTasks);
  const [allActivity, setAllActivity] = useState<ActivityLog[]>(seedActivity);
  const [universities, setUniversities] = useState<University[]>(seedUniversities);
  const [allOrgUnits, setAllOrgUnits] = useState<OrgUnit[]>(seedOrgUnits);
  const [allPlanNodes, setAllPlanNodes] = useState<PlanNode[]>(seedPlanNodes);
  const [allBudgets, setAllBudgets] = useState<Budget[]>(seedBudgets);
  const [allProcurementItems, setAllProcurementItems] =
    useState<ProcurementItem[]>(seedProcurementItems);
  const [allRequisitions, setAllRequisitions] = useState<Requisition[]>(seedRequisitions);
  const [allMaterialRequests, setAllMaterialRequests] =
    useState<MaterialRequest[]>(seedMaterialRequests);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // Which university the platform-wide admin is currently viewing — admin has
  // no university of its own, so everything university-scoped is empty until
  // it picks one from /universities. Resets on sign-in/out/switch; persisted
  // like the session itself so a refresh doesn't kick admin back out.
  const [adminViewingUniversityId, setAdminViewingUniversityId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [lastActiveById, setLastActiveById] = useState<Record<string, string>>(() =>
    Object.fromEntries(seedMembers.map((m) => [m.id, m.lastActiveAt])),
  );

  const touchActivity = useCallback((memberId: string) => {
    setLastActiveById((prev) => ({ ...prev, [memberId]: new Date().toISOString() }));
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored && seedMembers.some((m) => m.id === stored)) setCurrentUserId(stored);
      const storedUniversity = window.localStorage.getItem(ADMIN_VIEWING_STORAGE_KEY);
      if (storedUniversity && seedUniversities.some((u) => u.id === storedUniversity)) {
        setAdminViewingUniversityId(storedUniversity);
      }
    } catch {
      /* storage unavailable */
    }
    setReady(true);
  }, []);

  const session = allMembers.find((m) => m.id === currentUserId) ?? null;
  const currentUser = (session ?? allMembers[0]) as Member;

  // The university every university-scoped useMemo/mutator below reads from.
  // For everyone but admin this is just their own university; admin has none
  // of its own, so it's whichever university admin explicitly picked via
  // /universities, defaulting to the first one so admin's sidebar/dashboard
  // are fully populated without requiring that pick first.
  const effectiveUniversityId =
    currentUser.role === "admin"
      ? (adminViewingUniversityId ?? universities[0]?.id ?? null)
      : currentUser.universityId;

  const persist = useCallback((id: string | null) => {
    try {
      if (id) window.localStorage.setItem(SESSION_STORAGE_KEY, id);
      else window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const persistViewingUniversity = useCallback((universityId: string | null) => {
    try {
      if (universityId) window.localStorage.setItem(ADMIN_VIEWING_STORAGE_KEY, universityId);
      else window.localStorage.removeItem(ADMIN_VIEWING_STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const logActivity = useCallback(
    (action: ActivityAction, taskId: string, taskTitle: string, details: string) => {
      const entry: ActivityLog = {
        id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        action,
        taskId,
        taskTitle,
        details,
      };
      setAllActivity((prev) => [entry, ...prev]);
    },
    [currentUser.id],
  );

  const signIn = useCallback<WorkspaceContextValue["signIn"]>(
    (email, password) => {
      const result = authenticate(email, password, allMembers);
      if (!result.ok) {
        toast.error("Sign in failed", { description: result.error });
        return { ok: false, error: result.error };
      }
      setCurrentUserId(result.member.id);
      setAdminViewingUniversityId(null);
      persist(result.member.id);
      persistViewingUniversity(null);
      toast.success(`Welcome back, ${result.member.name.split(" ")[0]}`, {
        description: `Signed in as ${result.member.role}.`,
      });
      return { ok: true };
    },
    [persist, persistViewingUniversity, allMembers],
  );

  const signOut = useCallback(() => {
    setCurrentUserId(null);
    setAdminViewingUniversityId(null);
    persist(null);
    persistViewingUniversity(null);
    toast.success("Signed out");
  }, [persist, persistViewingUniversity]);

  const switchUser = useCallback(
    (id: string) => {
      setCurrentUserId(id);
      setAdminViewingUniversityId(null);
      persist(id);
      persistViewingUniversity(null);
    },
    [persist, persistViewingUniversity],
  );

  const can = useCallback(
    (action: Ability) => ROLE_ABILITIES[currentUser.role].includes(action),
    [currentUser.role],
  );

  // Every org unit in the current user's own university — structural metadata,
  // safe to expose read-only to admin and manager alike (breadcrumbs, pickers).
  const orgUnits = useMemo(
    () =>
      effectiveUniversityId
        ? allOrgUnits.filter((u) => u.universityId === effectiveUniversityId)
        : [],
    [allOrgUnits, effectiveUniversityId],
  );

  // The planning hierarchy for the current user's university — structural
  // metadata, admin-only to manage (phase 1), so no manager-subtree scoping needed.
  const planNodes = useMemo(
    () =>
      effectiveUniversityId
        ? allPlanNodes.filter((n) => n.universityId === effectiveUniversityId)
        : [],
    [allPlanNodes, effectiveUniversityId],
  );

  // The people visible to the current user: scoped to their university, and for
  // a manager-tier role (Principal/Dean/HOD/Campus Admin), further scoped to
  // the org-unit(s) they manage plus everything beneath them in the tree.
  const members = useMemo(() => {
    if (!effectiveUniversityId) return [] as Member[];
    const inUniversity = allMembers.filter((m) => m.universityId === effectiveUniversityId);
    if (!MANAGER_ROLES.includes(currentUser.role) || can("manageTeam")) return inUniversity;

    const managedUnitIds = orgUnits.filter((u) => u.managerId === currentUser.id).map((u) => u.id);
    if (managedUnitIds.length === 0) return inUniversity.filter((m) => m.id === currentUser.id);
    const scope = unitSubtreeIds(managedUnitIds, orgUnits);
    return inUniversity.filter(
      (m) => m.id === currentUser.id || (m.orgUnitId && scope.has(m.orgUnitId)),
    );
  }, [allMembers, currentUser, orgUnits, can, effectiveUniversityId]);

  // Tasks scoped the same way — plus unassigned university-wide backlog stays
  // visible to admin/manager-tier roles so it can be triaged into someone's
  // scope. Every other role (staff, student, finance) only ever sees their own
  // assigned tasks.
  const tasks = useMemo(() => {
    if (!effectiveUniversityId) return [] as Task[];
    const inUniversity = allTasks.filter((t) => t.universityId === effectiveUniversityId);
    if (can("manageTeam")) return inUniversity;
    if (MANAGER_ROLES.includes(currentUser.role)) {
      const scopedMemberIds = new Set(members.map((m) => m.id));
      return inUniversity.filter((t) => !t.assigneeId || scopedMemberIds.has(t.assigneeId));
    }
    return inUniversity.filter((t) => t.assigneeId === currentUser.id);
  }, [allTasks, currentUser, members, can, effectiveUniversityId]);

  const activity = useMemo(() => {
    if (!effectiveUniversityId) return [] as ActivityLog[];
    const scopedMemberIds = new Set(members.map((m) => m.id));
    return allActivity.filter((a) => scopedMemberIds.has(a.userId));
  }, [allActivity, members, effectiveUniversityId]);

  const visibleTasks = useMemo(
    () => (can("viewAll") ? tasks : tasks.filter((t) => t.assigneeId === currentUser.id)),
    [tasks, can, currentUser.id],
  );

  const memberById = useCallback(
    (id: string | null) => (id ? members.find((m) => m.id === id) : undefined),
    [members],
  );

  const orgUnitById = useCallback(
    (id: string | null) => (id ? orgUnits.find((u) => u.id === id) : undefined),
    [orgUnits],
  );

  const orgUnitPath = useCallback(
    (id: string | null): OrgUnit[] => {
      const path: OrgUnit[] = [];
      let current = id ? orgUnits.find((u) => u.id === id) : undefined;
      while (current) {
        path.unshift(current);
        current = current.parentId ? orgUnits.find((u) => u.id === current!.parentId) : undefined;
      }
      return path;
    },
    [orgUnits],
  );

  const planNodeById = useCallback(
    (id: string | null) => (id ? planNodes.find((n) => n.id === id) : undefined),
    [planNodes],
  );

  const planNodePath = useCallback(
    (id: string | null): PlanNode[] => {
      const path: PlanNode[] = [];
      let current = id ? planNodes.find((n) => n.id === id) : undefined;
      while (current) {
        path.unshift(current);
        current = current.parentId ? planNodes.find((n) => n.id === current!.parentId) : undefined;
      }
      return path;
    },
    [planNodes],
  );

  const addTask: WorkspaceContextValue["addTask"] = useCallback(
    (task) => {
      setAllTasks((prev) => {
        const nextId = `T-${1000 + prev.length + 1}`;
        return [
          {
            ...task,
            id: nextId,
            universityId: effectiveUniversityId ?? "",
            loggedHours: 0,
            createdAt: new Date().toISOString().slice(0, 10),
          },
          ...prev,
        ];
      });
      touchActivity(currentUser.id);
      toast.success("Task created", { description: task.title });
    },
    [currentUser.id, effectiveUniversityId, touchActivity],
  );

  const updateTask: WorkspaceContextValue["updateTask"] = useCallback(
    (id, fields) => {
      setAllTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...fields } : t)));
      const task = tasks.find((t) => t.id === id);
      if (task) logActivity("updated", id, task.title, "Task updated");
      touchActivity(currentUser.id);
      toast.success("Task updated");
    },
    [tasks, logActivity, currentUser.id, touchActivity],
  );

  const updateTaskStatus: WorkspaceContextValue["updateTaskStatus"] = useCallback(
    (ids, status) => {
      if (ids.length === 0) {
        toast.error("No tasks selected", { description: "Select at least one row first." });
        return;
      }
      setAllTasks((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, status } : t)));
      ids.forEach((id) => {
        const task = tasks.find((t) => t.id === id);
        if (task) {
          const details =
            status === "completed"
              ? "Completed"
              : status === "in_progress"
                ? "Started working on it"
                : status === "blocked"
                  ? "Marked as blocked"
                  : "Reset to not started";
          logActivity(
            status === "completed" ? "completed" : "status_change",
            id,
            task.title,
            details,
          );
        }
      });
      touchActivity(currentUser.id);
      toast.success(`${ids.length} task${ids.length > 1 ? "s" : ""} updated`);
    },
    [tasks, logActivity, currentUser.id, touchActivity],
  );

  const reassignTasks: WorkspaceContextValue["reassignTasks"] = useCallback(
    (ids, assigneeId) => {
      if (ids.length === 0) {
        toast.error("No tasks selected", { description: "Select at least one row first." });
        return;
      }
      setAllTasks((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, assigneeId } : t)));
      ids.forEach((id) => {
        const task = tasks.find((t) => t.id === id);
        const member = assigneeId ? members.find((m) => m.id === assigneeId) : null;
        if (task) {
          logActivity(
            "reassigned",
            id,
            task.title,
            assigneeId ? `Assigned to ${member?.name ?? "unknown"}` : "Moved to backlog",
          );
        }
      });
      touchActivity(currentUser.id);
      toast.success("Assignment updated", {
        description: assigneeId ? "Work has been reassigned." : "Tasks moved back to the backlog.",
      });
    },
    [tasks, members, logActivity, currentUser.id, touchActivity],
  );

  const deleteTasks: WorkspaceContextValue["deleteTasks"] = useCallback(
    (ids) => {
      if (ids.length === 0) {
        toast.error("No tasks selected");
        return;
      }
      ids.forEach((id) => {
        const task = tasks.find((t) => t.id === id);
        if (task) logActivity("deleted", id, task.title, "Task deleted");
      });
      setAllTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
      touchActivity(currentUser.id);
      toast.success(`${ids.length} task${ids.length > 1 ? "s" : ""} deleted`);
    },
    [tasks, logActivity, currentUser.id, touchActivity],
  );

  const getMemberStats = useCallback(
    (memberId: string): MemberStats => {
      const member = members.find((m) => m.id === memberId) ?? (members[0] as Member);
      const memberTasks = tasks.filter((t) => t.assigneeId === memberId);
      const openTasks = memberTasks.filter((t) => t.status !== "completed");
      const completedTasks = memberTasks.filter((t) => t.status === "completed");
      const inProgressTasks = memberTasks.filter((t) => t.status === "in_progress");
      const blockedTasks = memberTasks.filter((t) => t.status === "blocked");
      const hoursRemaining = openTasks.reduce(
        (sum, t) => sum + Math.max(0, t.estimateHours - t.loggedHours),
        0,
      );
      const loadPercent = Math.min(150, Math.round((hoursRemaining / member.capacityHours) * 100));
      const hasNoOpenTasks = openTasks.length === 0;
      const lastActiveAt = lastActiveById[memberId] ?? member.lastActiveAt;
      const minutesSinceActive = Math.max(
        0,
        Math.round((Date.now() - new Date(lastActiveAt).getTime()) / 60000),
      );
      const presence: PresenceStatus =
        minutesSinceActive <= ACTIVE_WINDOW_MIN
          ? "active"
          : minutesSinceActive <= IDLE_WINDOW_MIN
            ? "idle"
            : "away";
      const lastActivity = activity.find((a) => a.userId === memberId) ?? null;
      return {
        member,
        totalTasks: memberTasks.length,
        openTasks: openTasks.length,
        completedTasks: completedTasks.length,
        inProgressTasks: inProgressTasks.length,
        blockedTasks: blockedTasks.length,
        loadPercent,
        hoursRemaining,
        hasNoOpenTasks,
        presence,
        minutesSinceActive,
        lastActiveAt,
        isIdle: presence !== "active",
        lastActivity,
      };
    },
    [members, tasks, activity, lastActiveById],
  );

  const getTaskFlags = useCallback(
    (taskId: string): TaskFlags => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return { overdue: false, stalled: false, overBudget: false };
      const isOpen = task.status !== "completed";
      const today = new Date().toISOString().slice(0, 10);
      const overdue = isOpen && !!task.dueDate && task.dueDate < today;
      const taskActivity = activity.filter((a) => a.taskId === taskId);
      const lastTouchMs =
        taskActivity.length > 0
          ? Math.max(...taskActivity.map((a) => new Date(a.timestamp).getTime()))
          : new Date(task.createdAt).getTime();
      const stalled = isOpen && Date.now() - lastTouchMs > STALLED_DAYS * 24 * 60 * 60 * 1000;
      const overBudget = isOpen && task.loggedHours > task.estimateHours;
      return { overdue, stalled, overBudget };
    },
    [tasks, activity],
  );

  const principalForUniversity = useCallback(
    (universityId: string) =>
      allMembers.find((m) => m.universityId === universityId && m.role === "principal"),
    [allMembers],
  );

  const memberCountForUniversity = useCallback(
    (universityId: string) => allMembers.filter((m) => m.universityId === universityId).length,
    [allMembers],
  );

  const viewUniversity: WorkspaceContextValue["viewUniversity"] = useCallback(
    (universityId) => {
      setAdminViewingUniversityId(universityId);
      persistViewingUniversity(universityId);
    },
    [persistViewingUniversity],
  );

  const createUniversity: WorkspaceContextValue["createUniversity"] = useCallback(
    ({ name, adminName, adminEmail, type = "institution", code, description, active = true }) => {
      const normalized = adminEmail.trim().toLowerCase();
      if (allMembers.some((m) => m.email.toLowerCase() === normalized)) {
        toast.error("Email already in use", { description: "Pick a different admin email." });
        return;
      }
      const universityId = `univ-${Date.now()}`;
      const trimmedCode = code?.trim();
      const trimmedDescription = description?.trim();
      setUniversities((prev) => [
        ...prev,
        {
          id: universityId,
          name,
          type,
          active,
          createdAt: new Date().toISOString().slice(0, 10),
          ...(trimmedCode ? { code: trimmedCode } : {}),
          ...(trimmedDescription ? { description: trimmedDescription } : {}),
        },
      ]);
      setAllMembers((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          name: adminName,
          email: adminEmail.trim(),
          phone: "",
          role: "principal",
          title: "Principal",
          universityId,
          orgUnitId: null,
          capacityHours: 40,
          avatarColorIndex: prev.length % 5,
          lastActiveAt: new Date().toISOString(),
          active: true,
          hasSignature: false,
          actingFor: null,
          createdAt: new Date().toISOString().slice(0, 10),
        },
      ]);
      toast.success("University created", {
        description: `${name} is ready — ${adminName} can sign in with the shared demo password.`,
      });
    },
    [allMembers],
  );

  const addOrgUnit: WorkspaceContextValue["addOrgUnit"] = useCallback(
    ({ type, name, parentId }) => {
      if (!effectiveUniversityId) return;
      const unit: OrgUnit = {
        id: `ou-${Date.now()}`,
        universityId: effectiveUniversityId,
        type,
        name,
        parentId,
        managerId: null,
      };
      setAllOrgUnits((prev) => [...prev, unit]);
      toast.success(`${name} added`);
    },
    [effectiveUniversityId],
  );

  const renameOrgUnit: WorkspaceContextValue["renameOrgUnit"] = useCallback((id, name) => {
    setAllOrgUnits((prev) => prev.map((u) => (u.id === id ? { ...u, name } : u)));
    toast.success("Renamed");
  }, []);

  const deleteOrgUnit: WorkspaceContextValue["deleteOrgUnit"] = useCallback(
    (id) => {
      const hasChildren = orgUnits.some((u) => u.parentId === id);
      const hasMembers = allMembers.some((m) => m.orgUnitId === id);
      if (hasChildren || hasMembers) {
        toast.error("Can't delete this unit", {
          description: "Move or remove its sub-units and people first.",
        });
        return;
      }
      setAllOrgUnits((prev) => prev.filter((u) => u.id !== id));
      toast.success("Deleted");
    },
    [orgUnits, allMembers],
  );

  const assignManager: WorkspaceContextValue["assignManager"] = useCallback(
    (orgUnitId, memberId) => {
      setAllOrgUnits((prev) =>
        prev.map((u) => (u.id === orgUnitId ? { ...u, managerId: memberId } : u)),
      );
      const member = memberId ? allMembers.find((m) => m.id === memberId) : null;
      toast.success(member ? `${member.name} is now managing this unit` : "Manager removed");
    },
    [allMembers],
  );

  const addPlanNode: WorkspaceContextValue["addPlanNode"] = useCallback(
    ({ type, parentId, title, description, responsibleUnitId, ownerId, status, ...rest }) => {
      if (!effectiveUniversityId) return;
      const extra = Object.fromEntries(
        Object.entries(rest).filter(([, v]) => v !== undefined && v !== ""),
      ) as Partial<PlanNode>;
      const node: PlanNode = {
        id: `pn-${Date.now()}`,
        universityId: effectiveUniversityId,
        type,
        title,
        description: description ?? "",
        parentId,
        responsibleUnitId: responsibleUnitId ?? null,
        ownerId: ownerId ?? null,
        createdAt: new Date().toISOString().slice(0, 10),
        ...(type === "activity" ? { status: status ?? "not_started" } : {}),
        ...extra,
      };
      setAllPlanNodes((prev) => [...prev, node]);
      toast.success(`${title} added`);
    },
    [effectiveUniversityId],
  );

  const updatePlanNode: WorkspaceContextValue["updatePlanNode"] = useCallback((id, fields) => {
    setAllPlanNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...fields } : n)));
    toast.success("Updated");
  }, []);

  const deletePlanNode: WorkspaceContextValue["deletePlanNode"] = useCallback(
    (id) => {
      const hasChildren = planNodes.some((n) => n.parentId === id);
      const node = planNodes.find((n) => n.id === id);
      const hasTasks = node?.type === "activity" && allTasks.some((t) => t.activityId === id);
      if (hasChildren || hasTasks) {
        toast.error("Can't delete this", {
          description: "Move or remove its sub-items first.",
        });
        return false;
      }
      setAllPlanNodes((prev) => prev.filter((n) => n.id !== id));
      toast.success("Deleted");
      return true;
    },
    [planNodes, allTasks],
  );

  // Finance is role-based rather than unit-based — shared by Budget's chain
  // and, below, by Requisitions raised against MaterialRequest-derived
  // ProcurementItems (which route straight to Finance instead of a
  // department manager).
  const financeApproverId = useCallback(
    (): string | null =>
      allMembers.find((m) => m.universityId === effectiveUniversityId && m.role === "finance")
        ?.id ?? null,
    [allMembers, effectiveUniversityId],
  );

  // The current approver for a step is always re-resolved live from the org
  // chart (never trusted from a stored snapshot) — so reassigning a Dean or
  // Principal mid-flight doesn't strand a pending request with someone no
  // longer in the role. Decided steps keep their frozen `approverId` for audit.
  const liveApproverForStep = useCallback(
    (step: Pick<BudgetApprovalStep, "role" | "unitId">): string | null => {
      if (step.role === "finance") return financeApproverId();
      if (!step.unitId) return null;
      return orgUnitById(step.unitId)?.managerId ?? null;
    },
    [financeApproverId, orgUnitById],
  );

  type ChainResult =
    | {
        ok: true;
        steps: BudgetApprovalStep[];
        events: BudgetEvent[];
        currentStepIndex: number;
        status: BudgetStatus;
      }
    | { ok: false; blockedReason: string };

  // Builds the approval chain for a request, in fixed conceptual order
  // [hod, dean, campus_admin, principal, finance]. A level is omitted when it
  // structurally doesn't apply (e.g. no "hod" step if the responsible unit
  // isn't under any department). A level that DOES apply but has no one
  // assigned yet (a vacant seat) blocks submission instead of being silently
  // skipped — skipping would permanently drop a governance level for that
  // one request. Consecutive leading steps that resolve to the creator
  // themselves are auto-approved, so the chain's actual starting point shifts
  // depending on who submitted it (a Dean submitting skips their own "dean"
  // step entirely; a Lecturer submitting starts at "hod").
  const buildBudgetChain = useCallback(
    (planNodeId: string, createdById: string): ChainResult => {
      const node = planNodes.find((n) => n.id === planNodeId);
      const path = orgUnitPath(node?.responsibleUnitId ?? null);
      const departmentId = path.find((u) => u.type === "department")?.id;
      const schoolId = path.find((u) => u.type === "school")?.id;
      const collegeId = path.find((u) => u.type === "college")?.id;
      const creator = allMembers.find((m) => m.id === createdById);
      const campusId = creator?.homeCampusId;

      const candidates: Array<Pick<BudgetApprovalStep, "role" | "unitId">> = [];
      if (departmentId) candidates.push({ role: "hod", unitId: departmentId });
      if (schoolId) candidates.push({ role: "dean", unitId: schoolId });
      if (campusId) candidates.push({ role: "campus_admin", unitId: campusId });
      if (collegeId) candidates.push({ role: "principal", unitId: collegeId });
      candidates.push({ role: "finance" });

      const now = new Date().toISOString();
      const steps: BudgetApprovalStep[] = [];
      for (const c of candidates) {
        const approverId = liveApproverForStep(c);
        if (approverId === null) {
          return {
            ok: false,
            blockedReason: `No ${APPROVAL_STEP_LABELS[c.role]} is assigned yet — assign one before requesting a budget.`,
          };
        }
        steps.push({
          role: c.role,
          ...(c.unitId ? { unitId: c.unitId } : {}),
          approverId,
          decision: "pending",
          reachedAt: now,
        });
      }

      const events: BudgetEvent[] = [];
      let idx = 0;
      while (idx < steps.length && steps[idx]!.approverId === createdById) {
        steps[idx] = { ...steps[idx]!, decision: "approved", decidedAt: now };
        events.push({
          id: `be-${Date.now()}-${idx}`,
          timestamp: now,
          actorId: createdById,
          role: steps[idx]!.role,
          decision: "approved",
        });
        idx += 1;
      }
      const status: BudgetStatus = idx >= steps.length ? "approved" : "pending";
      return { ok: true, steps, events, currentStepIndex: Math.min(idx, steps.length - 1), status };
    },
    [planNodes, orgUnitPath, allMembers, liveApproverForStep],
  );

  type MaterialRequestChainResult =
    | {
        ok: true;
        steps: MaterialRequestStep[];
        events: MaterialRequestEvent[];
        currentStepIndex: number;
        status: MaterialRequestStatus;
      }
    | { ok: false; blockedReason: string };

  // Mirrors buildBudgetChain, but rooted from the TASK'S OWN ASSIGNEE
  // (the lecturer) rather than a PlanNode's responsibleUnitId — so the
  // chain always resolves to that lecturer's own department/school/college,
  // regardless of which school the parent Activity is assigned to. Fixed
  // order [hod, dean, principal] only — no campus_admin, no finance (Finance
  // enters later via Requisition once Procurement hands off, not as a step
  // here).
  const buildMaterialRequestChain = useCallback(
    (taskId: string, createdById: string): MaterialRequestChainResult => {
      const task = allTasks.find((t) => t.id === taskId);
      const assignee = allMembers.find((m) => m.id === task?.assigneeId);
      const path = orgUnitPath(assignee?.orgUnitId ?? null);
      const departmentId = path.find((u) => u.type === "department")?.id;
      const schoolId = path.find((u) => u.type === "school")?.id;
      const collegeId = path.find((u) => u.type === "college")?.id;

      const candidates: Array<Pick<MaterialRequestStep, "role" | "unitId">> = [];
      if (departmentId) candidates.push({ role: "hod", unitId: departmentId });
      if (schoolId) candidates.push({ role: "dean", unitId: schoolId });
      if (collegeId) candidates.push({ role: "principal", unitId: collegeId });

      if (candidates.length === 0) {
        return {
          ok: false,
          blockedReason: "This task's assignee isn't placed in a department yet.",
        };
      }

      const now = new Date().toISOString();
      const steps: MaterialRequestStep[] = [];
      for (const c of candidates) {
        const approverId = liveApproverForStep(c);
        if (approverId === null) {
          return {
            ok: false,
            blockedReason: `No ${APPROVAL_STEP_LABELS[c.role]} is assigned yet — assign one before requesting materials.`,
          };
        }
        steps.push({
          role: c.role,
          ...(c.unitId ? { unitId: c.unitId } : {}),
          approverId,
          decision: "pending",
          reachedAt: now,
        });
      }

      const events: MaterialRequestEvent[] = [];
      let idx = 0;
      while (idx < steps.length && steps[idx]!.approverId === createdById) {
        steps[idx] = { ...steps[idx]!, decision: "approved", decidedAt: now };
        events.push({
          id: `mre-${Date.now()}-${idx}`,
          timestamp: now,
          actorId: createdById,
          role: steps[idx]!.role,
          decision: "approved",
        });
        idx += 1;
      }
      const status: MaterialRequestStatus = idx >= steps.length ? "approved" : "pending";
      return { ok: true, steps, events, currentStepIndex: Math.min(idx, steps.length - 1), status };
    },
    [allTasks, allMembers, orgUnitPath, liveApproverForStep],
  );

  const currentApproverId: WorkspaceContextValue["currentApproverId"] = useCallback(
    (budget) => {
      const step = budget.steps[budget.currentStepIndex];
      return step ? liveApproverForStep(step) : null;
    },
    [liveApproverForStep],
  );

  const currentMaterialRequestApproverId: WorkspaceContextValue["currentMaterialRequestApproverId"] =
    useCallback(
      (request) => {
        const step = request.steps[request.currentStepIndex];
        return step ? liveApproverForStep(step) : null;
      },
      [liveApproverForStep],
    );

  // Visible to admins (full oversight), the creator, or anyone whose step has
  // already been reached (decided steps check the frozen approverId so
  // history stays stable; the current pending step is live-resolved).
  const budgets = useMemo(() => {
    if (!effectiveUniversityId) return [] as Budget[];
    const inUniversity = allBudgets.filter((b) => b.universityId === effectiveUniversityId);
    if (can("manageTeam")) return inUniversity;
    return inUniversity.filter((b) => {
      if (b.createdById === currentUser.id) return true;
      const idx = b.steps.findIndex((s, i) =>
        i === b.currentStepIndex
          ? liveApproverForStep(s) === currentUser.id
          : s.approverId === currentUser.id,
      );
      return idx !== -1 && idx <= b.currentStepIndex;
    });
  }, [allBudgets, currentUser, can, liveApproverForStep, effectiveUniversityId]);

  const budgetForPlanNode: WorkspaceContextValue["budgetForPlanNode"] = useCallback(
    (planNodeId) => budgets.find((b) => b.planNodeId === planNodeId),
    [budgets],
  );

  const submitBudget: WorkspaceContextValue["submitBudget"] = useCallback(
    ({ planNodeId, description, requestedAmount, currency = "RWF" }) => {
      if (!effectiveUniversityId) return;
      const result = buildBudgetChain(planNodeId, currentUser.id);
      if (!result.ok) {
        toast.error("Can't submit this budget", { description: result.blockedReason });
        return;
      }
      const now = new Date().toISOString();
      const budget: Budget = {
        id: `bud-${Date.now()}`,
        universityId: effectiveUniversityId,
        planNodeId,
        description,
        requestedAmount,
        currency,
        createdById: currentUser.id,
        status: result.status,
        currentStepIndex: result.currentStepIndex,
        steps: result.steps,
        events: result.events,
        disbursed: false,
        createdAt: now,
        updatedAt: now,
      };
      setAllBudgets((prev) => [...prev, budget]);
      toast.success(
        result.status === "approved"
          ? "Budget submitted and fully approved"
          : "Budget request submitted",
      );
    },
    [currentUser, buildBudgetChain, effectiveUniversityId],
  );

  const decideBudgetStep: WorkspaceContextValue["decideBudgetStep"] = useCallback(
    (budgetId, decision, comment) => {
      const budget = allBudgets.find((b) => b.id === budgetId);
      if (!budget) return;
      if (budget.status !== "pending") {
        toast.error("This request isn't awaiting a decision.");
        return;
      }
      const step = budget.steps[budget.currentStepIndex];
      if (!step || liveApproverForStep(step) !== currentUser.id) {
        toast.error("This isn't waiting on you", {
          description: "Only the current approver can act on it.",
        });
        return;
      }
      const trimmedComment = comment?.trim();
      if ((decision === "rejected" || decision === "queried") && !trimmedComment) {
        toast.error("A comment is required", {
          description: "Explain why you're rejecting or querying this.",
        });
        return;
      }
      const now = new Date().toISOString();
      setAllBudgets((prev) =>
        prev.map((b) => {
          if (b.id !== budgetId) return b;
          const steps = b.steps.map((s, i) =>
            i === b.currentStepIndex
              ? {
                  ...s,
                  approverId: currentUser.id,
                  decision,
                  decidedAt: now,
                  ...(trimmedComment ? { comment: trimmedComment } : {}),
                }
              : s,
          );
          const event: BudgetEvent = {
            id: `be-${Date.now()}`,
            timestamp: now,
            actorId: currentUser.id,
            role: step.role,
            decision,
            ...(trimmedComment ? { comment: trimmedComment } : {}),
          };
          let status: BudgetStatus = b.status;
          let currentStepIndex = b.currentStepIndex;
          if (decision === "approved") {
            if (b.currentStepIndex >= steps.length - 1) {
              status = "approved";
            } else {
              currentStepIndex = b.currentStepIndex + 1;
              steps[currentStepIndex] = { ...steps[currentStepIndex]!, reachedAt: now };
              status = "pending";
            }
          } else {
            status = decision;
          }
          return {
            ...b,
            steps,
            status,
            currentStepIndex,
            events: [...b.events, event],
            updatedAt: now,
          };
        }),
      );
      toast.success(
        decision === "approved" ? "Approved" : decision === "rejected" ? "Rejected" : "Query sent",
      );
    },
    [allBudgets, liveApproverForStep, currentUser.id],
  );

  const resubmitBudget: WorkspaceContextValue["resubmitBudget"] = useCallback(
    (budgetId, { description, requestedAmount, comment }) => {
      const budget = allBudgets.find((b) => b.id === budgetId);
      if (!budget) return;
      if (budget.status !== "queried") {
        toast.error("This request isn't waiting for a response.");
        return;
      }
      if (budget.createdById !== currentUser.id) {
        toast.error("Only the person who submitted this can respond.");
        return;
      }
      const amountChanged =
        requestedAmount !== undefined && requestedAmount !== budget.requestedAmount;
      let rebuilt: ChainResult | null = null;
      if (amountChanged) {
        const result = buildBudgetChain(budget.planNodeId, budget.createdById);
        if (!result.ok) {
          toast.error("Can't resubmit", { description: result.blockedReason });
          return;
        }
        rebuilt = result;
      }

      const now = new Date().toISOString();
      const trimmedComment = comment.trim();
      setAllBudgets((prev) =>
        prev.map((b) => {
          if (b.id !== budgetId) return b;
          const priorRole = b.steps[b.currentStepIndex]?.role ?? b.steps[0]?.role ?? "hod";
          const baseEvent: BudgetEvent = {
            id: `be-${Date.now()}`,
            timestamp: now,
            actorId: currentUser.id,
            role: priorRole,
            decision: "pending",
            ...(trimmedComment ? { comment: trimmedComment } : {}),
          };
          if (rebuilt) {
            return {
              ...b,
              ...(description !== undefined ? { description } : {}),
              requestedAmount: requestedAmount as number,
              status: rebuilt.status,
              currentStepIndex: rebuilt.currentStepIndex,
              steps: rebuilt.steps,
              events: [...b.events, baseEvent, ...rebuilt.events],
              updatedAt: now,
            };
          }
          const steps = b.steps.map((s, i) => {
            if (i !== b.currentStepIndex) return s;
            const { comment: _oldComment, decidedAt: _oldDecidedAt, ...rest } = s;
            return { ...rest, decision: "pending" as const };
          });
          return {
            ...b,
            ...(description !== undefined ? { description } : {}),
            status: "pending" as const,
            steps,
            events: [...b.events, baseEvent],
            updatedAt: now,
          };
        }),
      );
      toast.success(
        amountChanged ? "Resubmitted — approval chain restarted" : "Resubmitted for review",
      );
    },
    [allBudgets, currentUser.id, buildBudgetChain],
  );

  const setBudgetDisbursed: WorkspaceContextValue["setBudgetDisbursed"] = useCallback(
    (budgetId, disbursed) => {
      const now = new Date().toISOString();
      setAllBudgets((prev) =>
        prev.map((b) => {
          if (b.id !== budgetId) return b;
          const { disbursedAt: _prevDisbursedAt, ...rest } = b;
          return {
            ...rest,
            disbursed,
            updatedAt: now,
            ...(disbursed ? { disbursedAt: now } : {}),
          };
        }),
      );
      toast.success(disbursed ? "Marked as disbursed" : "Marked as not yet disbursed");
    },
    [],
  );

  // Finance isn't a manager and never created these, but once a
  // MaterialRequest is fully approved it's eligible to move to
  // procurement/finance regardless of whether it's been sent yet — Finance
  // needs to actually see it, not just be authorized to decide on it later.
  const isFinanceReviewer =
    currentUser.role === "finance" && financeApproverId() === currentUser.id;

  // Visible to admins (full oversight), the creator (the lecturer), or
  // anyone whose step has already been reached — same shape as `budgets`.
  const materialRequests = useMemo(() => {
    if (!effectiveUniversityId) return [] as MaterialRequest[];
    const inUniversity = allMaterialRequests.filter(
      (r) => r.universityId === effectiveUniversityId,
    );
    if (can("manageTeam")) return inUniversity;
    return inUniversity.filter((r) => {
      if (r.createdById === currentUser.id) return true;
      if (isFinanceReviewer && r.status === "approved") return true;
      const idx = r.steps.findIndex((s, i) =>
        i === r.currentStepIndex
          ? liveApproverForStep(s) === currentUser.id
          : s.approverId === currentUser.id,
      );
      return idx !== -1 && idx <= r.currentStepIndex;
    });
  }, [
    allMaterialRequests,
    currentUser,
    can,
    liveApproverForStep,
    effectiveUniversityId,
    isFinanceReviewer,
  ]);

  const materialRequestForTask: WorkspaceContextValue["materialRequestForTask"] = useCallback(
    (taskId) => materialRequests.find((r) => r.taskId === taskId),
    [materialRequests],
  );

  const submitMaterialRequest: WorkspaceContextValue["submitMaterialRequest"] = useCallback(
    ({ taskId, items }) => {
      const task = allTasks.find((t) => t.id === taskId);
      if (!task) {
        toast.error("Task not found");
        return;
      }
      if (task.assigneeId !== currentUser.id) {
        toast.error("Only the assigned lecturer can plan materials for this task");
        return;
      }
      if (items.length === 0) {
        toast.error("Add at least one material line");
        return;
      }
      if (allMaterialRequests.some((r) => r.taskId === taskId)) {
        toast.error("A material request already exists for this task");
        return;
      }
      if (!effectiveUniversityId) return;
      const result = buildMaterialRequestChain(taskId, currentUser.id);
      if (!result.ok) {
        toast.error("Can't submit this request", { description: result.blockedReason });
        return;
      }
      const now = new Date().toISOString();
      const request: MaterialRequest = {
        id: `mr-${Date.now()}`,
        universityId: effectiveUniversityId,
        taskId,
        activityId: task.activityId,
        items: items.map((it, i) => ({ id: `mri-${Date.now()}-${i}`, ...it })),
        createdById: currentUser.id,
        status: result.status,
        currentStepIndex: result.currentStepIndex,
        steps: result.steps,
        events: result.events,
        createdAt: now,
        updatedAt: now,
      };
      setAllMaterialRequests((prev) => [...prev, request]);
      toast.success(
        result.status === "approved"
          ? "Material request submitted and fully approved"
          : "Material request submitted for approval",
      );
    },
    [allTasks, allMaterialRequests, currentUser, buildMaterialRequestChain, effectiveUniversityId],
  );

  const decideMaterialRequestStep: WorkspaceContextValue["decideMaterialRequestStep"] = useCallback(
    (id, decision, comment) => {
      const request = allMaterialRequests.find((r) => r.id === id);
      if (!request) return;
      if (request.status !== "pending") {
        toast.error("This request isn't awaiting a decision.");
        return;
      }
      const step = request.steps[request.currentStepIndex];
      if (!step || liveApproverForStep(step) !== currentUser.id) {
        toast.error("This isn't waiting on you", {
          description: "Only the current approver can act on it.",
        });
        return;
      }
      const trimmedComment = comment?.trim();
      if ((decision === "rejected" || decision === "queried") && !trimmedComment) {
        toast.error("A comment is required", {
          description: "Explain why you're rejecting or querying this.",
        });
        return;
      }
      const now = new Date().toISOString();
      setAllMaterialRequests((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const steps = r.steps.map((s, i) =>
            i === r.currentStepIndex
              ? {
                  ...s,
                  decision,
                  decidedAt: now,
                  ...(trimmedComment ? { comment: trimmedComment } : {}),
                }
              : s,
          );
          const isLastStep = r.currentStepIndex === steps.length - 1;
          const status: MaterialRequestStatus =
            decision === "approved"
              ? isLastStep
                ? "approved"
                : "pending"
              : decision === "rejected"
                ? "rejected"
                : "queried";
          return {
            ...r,
            steps,
            status,
            currentStepIndex:
              decision === "approved" && !isLastStep ? r.currentStepIndex + 1 : r.currentStepIndex,
            events: [
              ...r.events,
              {
                id: `mre-${Date.now()}`,
                timestamp: now,
                actorId: currentUser.id,
                role: step.role,
                decision,
                ...(trimmedComment ? { comment: trimmedComment } : {}),
              },
            ],
            updatedAt: now,
          };
        }),
      );
      toast.success(
        decision === "approved"
          ? "Approved"
          : decision === "rejected"
            ? "Rejected"
            : "Query sent back to the lecturer",
      );
    },
    [allMaterialRequests, currentUser, liveApproverForStep],
  );

  const resubmitMaterialRequest: WorkspaceContextValue["resubmitMaterialRequest"] = useCallback(
    (id, { items, comment }) => {
      const request = allMaterialRequests.find((r) => r.id === id);
      if (!request) return;
      if (request.createdById !== currentUser.id) {
        toast.error("Only the lecturer who submitted this can resubmit it");
        return;
      }
      if (request.status !== "queried") {
        toast.error("This request isn't awaiting your response.");
        return;
      }
      let rebuilt: MaterialRequestChainResult | null = null;
      if (items) {
        const result = buildMaterialRequestChain(request.taskId, currentUser.id);
        if (!result.ok) {
          toast.error("Can't resubmit this request", { description: result.blockedReason });
          return;
        }
        rebuilt = result;
      }

      const now = new Date().toISOString();
      const trimmedComment = comment.trim();
      setAllMaterialRequests((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const priorRole = r.steps[r.currentStepIndex]?.role ?? r.steps[0]?.role ?? "hod";
          const baseEvent: MaterialRequestEvent = {
            id: `mre-${Date.now()}`,
            timestamp: now,
            actorId: currentUser.id,
            role: priorRole,
            decision: "pending",
            ...(trimmedComment ? { comment: trimmedComment } : {}),
          };
          if (rebuilt) {
            return {
              ...r,
              items: items!.map((it, i) => ({ id: `mri-${Date.now()}-${i}`, ...it })),
              status: rebuilt.status,
              currentStepIndex: rebuilt.currentStepIndex,
              steps: rebuilt.steps,
              events: [...r.events, baseEvent, ...rebuilt.events],
              updatedAt: now,
            };
          }
          const steps = r.steps.map((s, i) => {
            if (i !== r.currentStepIndex) return s;
            const { comment: _oldComment, decidedAt: _oldDecidedAt, ...rest } = s;
            return { ...rest, decision: "pending" as const };
          });
          return {
            ...r,
            status: "pending" as const,
            steps,
            events: [...r.events, baseEvent],
            updatedAt: now,
          };
        }),
      );
      toast.success("Resubmitted for review");
    },
    [allMaterialRequests, currentUser.id, buildMaterialRequestChain],
  );

  const sendMaterialRequestToProcurement: WorkspaceContextValue["sendMaterialRequestToProcurement"] =
    useCallback(
      (
        materialRequestId,
        { method, plannedProcurementDate, requiredDeliveryDate, fundingSource },
      ) => {
        const request = allMaterialRequests.find((r) => r.id === materialRequestId);
        if (!request) {
          toast.error("Material request not found");
          return;
        }
        if (request.status !== "approved") {
          toast.error("This request isn't fully approved yet");
          return;
        }
        if (allProcurementItems.some((p) => p.materialRequestId === materialRequestId)) {
          toast.error("Already sent to procurement");
          return;
        }
        const approverId = financeApproverId();
        if (!approverId) {
          toast.error("No Director of Finance is assigned yet", {
            description: "Assign one before sending materials to procurement.",
          });
          return;
        }
        const task = allTasks.find((t) => t.id === request.taskId);
        const assignee = allMembers.find((m) => m.id === task?.assigneeId);
        if (!effectiveUniversityId) return;
        const now = new Date().toISOString();
        const newItems: ProcurementItem[] = request.items.map((line, i) => ({
          id: `PROC-${Date.now()}-${i}`,
          universityId: effectiveUniversityId,
          budgetId: null,
          materialRequestId,
          planNodeId: request.activityId ?? "",
          item: line.item,
          specification: `Requested by ${assignee?.name ?? "the assigned lecturer"} for task "${task?.title ?? ""}"`,
          quantity: line.quantity,
          estimatedCost: line.estimatedCost,
          method,
          plannedProcurementDate,
          requiredDeliveryDate,
          responsibleUnitId: assignee?.orgUnitId ?? null,
          fundingSource,
          status: "planned",
          createdById: currentUser.id,
          createdAt: now,
          updatedAt: now,
        }));
        const newRequisitions: Requisition[] = newItems.map((item, i) => ({
          id: `REQ-${Date.now()}-${i}`,
          universityId: effectiveUniversityId,
          procurementItemId: item.id,
          budgetId: null,
          planNodeId: item.planNodeId,
          amount: item.estimatedCost,
          requestedById: currentUser.id,
          approverId,
          status: "pending",
          createdAt: now,
        }));
        setAllProcurementItems((prev) => [...prev, ...newItems]);
        setAllRequisitions((prev) => [...prev, ...newRequisitions]);
        toast.success("Sent to procurement", {
          description: "Finance can now decide on the resulting requisition(s).",
        });
      },
      [
        allMaterialRequests,
        allProcurementItems,
        allTasks,
        allMembers,
        currentUser,
        financeApproverId,
        effectiveUniversityId,
      ],
    );

  // The subtree a manager-tier user reaches — reused for Procurement/Requisition
  // visibility exactly like `members` already does for its own scoping.
  const managedUnitSubtree = useMemo(() => {
    if (!MANAGER_ROLES.includes(currentUser.role)) return null;
    const managedUnitIds = orgUnits.filter((u) => u.managerId === currentUser.id).map((u) => u.id);
    if (managedUnitIds.length === 0) return new Set<string>();
    return unitSubtreeIds(managedUnitIds, orgUnits);
  }, [currentUser, orgUnits]);

  const procurementItems = useMemo(() => {
    if (!effectiveUniversityId) return [] as ProcurementItem[];
    const inUniversity = allProcurementItems.filter(
      (p) => p.universityId === effectiveUniversityId,
    );
    if (can("manageTeam")) return inUniversity;
    return inUniversity.filter((p) => {
      if (p.createdById === currentUser.id) return true;
      if (isFinanceReviewer && p.materialRequestId) return true;
      return !!p.responsibleUnitId && (managedUnitSubtree?.has(p.responsibleUnitId) ?? false);
    });
  }, [
    allProcurementItems,
    currentUser,
    can,
    managedUnitSubtree,
    effectiveUniversityId,
    isFinanceReviewer,
  ]);

  const requisitions = useMemo(() => {
    if (!effectiveUniversityId) return [] as Requisition[];
    const inUniversity = allRequisitions.filter((r) => r.universityId === effectiveUniversityId);
    if (can("manageTeam")) return inUniversity;
    return inUniversity.filter((r) => {
      if (r.requestedById === currentUser.id) return true;
      const item = allProcurementItems.find((p) => p.id === r.procurementItemId);
      if (isFinanceReviewer && item?.materialRequestId) return true;
      return (
        !!item?.responsibleUnitId && (managedUnitSubtree?.has(item.responsibleUnitId) ?? false)
      );
    });
  }, [
    allRequisitions,
    currentUser,
    can,
    managedUnitSubtree,
    allProcurementItems,
    effectiveUniversityId,
    isFinanceReviewer,
  ]);

  const budgetCommitted: WorkspaceContextValue["budgetCommitted"] = useCallback(
    (budgetId) =>
      allRequisitions
        .filter((r) => r.budgetId === budgetId && r.status === "approved")
        .reduce((sum, r) => sum + r.amount, 0),
    [allRequisitions],
  );

  const addProcurementItem: WorkspaceContextValue["addProcurementItem"] = useCallback(
    ({
      budgetId,
      item,
      specification,
      quantity,
      estimatedCost,
      method,
      plannedProcurementDate,
      requiredDeliveryDate,
      responsibleUnitId,
      fundingSource,
    }) => {
      const budget = allBudgets.find((b) => b.id === budgetId);
      if (!budget) return;
      if (budget.status !== "approved") {
        toast.error("Budget isn't approved yet", {
          description: "Procurement can only be planned against a fully approved budget.",
        });
        return;
      }
      if (!effectiveUniversityId) return;
      const now = new Date().toISOString();
      const newItem: ProcurementItem = {
        id: `PROC-${Date.now()}`,
        universityId: effectiveUniversityId,
        budgetId,
        planNodeId: budget.planNodeId,
        item,
        specification,
        quantity,
        estimatedCost,
        method,
        plannedProcurementDate,
        requiredDeliveryDate,
        responsibleUnitId,
        fundingSource,
        status: "planned",
        createdById: currentUser.id,
        createdAt: now,
        updatedAt: now,
      };
      setAllProcurementItems((prev) => [...prev, newItem]);
      toast.success(`${item} added to the procurement plan`);
    },
    [allBudgets, currentUser, effectiveUniversityId],
  );

  const setProcurementStatus: WorkspaceContextValue["setProcurementStatus"] = useCallback(
    (id, status) => {
      setAllProcurementItems((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p)),
      );
      toast.success("Procurement status updated");
    },
    [],
  );

  const submitRequisition: WorkspaceContextValue["submitRequisition"] = useCallback(
    ({ procurementItemId, amount }) => {
      const item = allProcurementItems.find((p) => p.id === procurementItemId);
      if (!item) {
        toast.error("Procurement item not found");
        return;
      }

      // MaterialRequest-derived items skip the Budget-pool checks (each line
      // is its own item, capped by its own estimatedCost) and route straight
      // to Finance instead of a department manager.
      if (item.materialRequestId) {
        const request = allMaterialRequests.find((r) => r.id === item.materialRequestId);
        if (!request || request.status !== "approved") {
          toast.error("Can't submit this requisition", {
            description: "The material request isn't approved.",
          });
          return;
        }
        if (amount > item.estimatedCost) {
          toast.error("Amount exceeds the approved estimate", {
            description: `Only up to ${item.estimatedCost.toLocaleString()} was approved for this line.`,
          });
          return;
        }
        const approverId = financeApproverId();
        if (!approverId) {
          toast.error("No Director of Finance is assigned yet");
          return;
        }
        if (!effectiveUniversityId) return;
        const requisition: Requisition = {
          id: `REQ-${Date.now()}`,
          universityId: effectiveUniversityId,
          procurementItemId,
          budgetId: null,
          planNodeId: item.planNodeId,
          amount,
          requestedById: currentUser.id,
          approverId,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        setAllRequisitions((prev) => [...prev, requisition]);
        toast.success("Requisition submitted");
        return;
      }

      const budget = allBudgets.find((b) => b.id === item.budgetId);
      if (!budget || budget.status !== "approved") {
        toast.error("Can't submit this requisition", { description: "The budget isn't approved." });
        return;
      }
      const committed = allRequisitions
        .filter((r) => r.budgetId === budget.id && r.status === "approved")
        .reduce((sum, r) => sum + r.amount, 0);
      if (committed + amount > budget.requestedAmount) {
        toast.error("Insufficient budget remaining", {
          description: `Only ${(budget.requestedAmount - committed).toLocaleString()} ${budget.currency} remains on this budget.`,
        });
        return;
      }
      if (
        !can("manageTeam") &&
        currentUser.id !== budget.createdById &&
        !MANAGER_ROLES.includes(currentUser.role)
      ) {
        toast.error("Not authorized", {
          description: "Only the budget owner or a manager can raise a requisition.",
        });
        return;
      }
      const approverId = item.responsibleUnitId
        ? (orgUnitById(item.responsibleUnitId)?.managerId ?? null)
        : null;
      if (!approverId) {
        toast.error("No approver assigned", {
          description: "Assign a manager to the responsible unit before requesting.",
        });
        return;
      }
      if (!effectiveUniversityId) return;
      const requisition: Requisition = {
        id: `REQ-${Date.now()}`,
        universityId: effectiveUniversityId,
        procurementItemId,
        budgetId: budget.id,
        planNodeId: budget.planNodeId,
        amount,
        requestedById: currentUser.id,
        approverId,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      setAllRequisitions((prev) => [...prev, requisition]);
      toast.success("Requisition submitted");
    },
    [
      allProcurementItems,
      allBudgets,
      allRequisitions,
      allMaterialRequests,
      can,
      currentUser,
      orgUnitById,
      financeApproverId,
      effectiveUniversityId,
    ],
  );

  const decideRequisition: WorkspaceContextValue["decideRequisition"] = useCallback(
    (id, decision, comment) => {
      const requisition = allRequisitions.find((r) => r.id === id);
      if (!requisition || requisition.status !== "pending") {
        toast.error("This requisition isn't awaiting a decision.");
        return;
      }
      const item = allProcurementItems.find((p) => p.id === requisition.procurementItemId);
      const liveApprover = item?.materialRequestId
        ? financeApproverId()
        : item?.responsibleUnitId
          ? orgUnitById(item.responsibleUnitId)?.managerId
          : null;
      if (liveApprover !== currentUser.id && !can("manageTeam")) {
        toast.error("This isn't waiting on you");
        return;
      }
      const trimmedComment = comment?.trim();
      if (decision === "rejected" && !trimmedComment) {
        toast.error("A comment is required", { description: "Explain why you're rejecting this." });
        return;
      }
      setAllRequisitions((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: decision,
                approverId: currentUser.id,
                decidedAt: new Date().toISOString(),
                ...(trimmedComment ? { comment: trimmedComment } : {}),
              }
            : r,
        ),
      );
      toast.success(decision === "approved" ? "Requisition approved" : "Requisition rejected");
    },
    [allRequisitions, allProcurementItems, orgUnitById, currentUser, can, financeApproverId],
  );

  const addMember: WorkspaceContextValue["addMember"] = useCallback(
    ({ name, email, role, orgUnitId, phone, title, homeCampusId, ...hr }) => {
      const normalized = email.trim().toLowerCase();
      if (allMembers.some((m) => m.email.toLowerCase() === normalized)) {
        toast.error("Email already in use", { description: "Pick a different email." });
        return;
      }
      if (!effectiveUniversityId) return;
      const hrFields = Object.fromEntries(
        Object.entries(hr).filter(([, v]) => v !== undefined && v !== ""),
      ) as Partial<MemberHrFields>;
      setAllMembers((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          name,
          email: email.trim(),
          phone: phone?.trim() ?? "",
          role,
          title: title?.trim() || (MANAGER_ROLES.includes(role) ? "Manager" : "Team member"),
          universityId: effectiveUniversityId,
          orgUnitId,
          capacityHours: 40,
          avatarColorIndex: prev.length % 5,
          lastActiveAt: new Date().toISOString(),
          active: true,
          hasSignature: false,
          actingFor: null,
          createdAt: new Date().toISOString().slice(0, 10),
          ...(homeCampusId ? { homeCampusId } : {}),
          ...hrFields,
        },
      ]);
      toast.success(`${name} added`, { description: "Signs in with the shared demo password." });
    },
    [allMembers, effectiveUniversityId],
  );

  const updateMember: WorkspaceContextValue["updateMember"] = useCallback((id, fields) => {
    setAllMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...fields } : m)));
    toast.success("User updated");
  }, []);

  const setMemberActive: WorkspaceContextValue["setMemberActive"] = useCallback((id, active) => {
    setAllMembers((prev) => prev.map((m) => (m.id === id ? { ...m, active } : m)));
    toast.success(active ? "User activated" : "User deactivated");
  }, []);

  const deleteMember: WorkspaceContextValue["deleteMember"] = useCallback(
    (id) => {
      const hasOpenTasks = allTasks.some((t) => t.assigneeId === id && t.status !== "completed");
      const managesUnit = allOrgUnits.some((u) => u.managerId === id);
      if (hasOpenTasks || managesUnit) {
        toast.error("Can't delete this user", {
          description: "Reassign their open tasks and unit management first.",
        });
        return;
      }
      setAllMembers((prev) => prev.filter((m) => m.id !== id));
      toast.success("User deleted");
    },
    [allTasks, allOrgUnits],
  );

  const value: WorkspaceContextValue = {
    members,
    tasks,
    activity,
    universities,
    orgUnits,
    currentUser,
    session,
    ready,
    signIn,
    signOut,
    setCurrentUserId: switchUser,
    visibleTasks,
    addTask,
    updateTask,
    updateTaskStatus,
    reassignTasks,
    deleteTasks,
    memberById,
    getMemberStats,
    getTaskFlags,
    can,
    orgUnitById,
    orgUnitPath,
    principalForUniversity,
    memberCountForUniversity,
    adminViewingUniversityId,
    effectiveUniversityId,
    viewUniversity,
    createUniversity,
    addOrgUnit,
    renameOrgUnit,
    deleteOrgUnit,
    assignManager,
    addMember,
    updateMember,
    setMemberActive,
    deleteMember,
    planNodes,
    planNodeById,
    planNodePath,
    addPlanNode,
    updatePlanNode,
    deletePlanNode,
    budgets,
    budgetForPlanNode,
    currentApproverId,
    submitBudget,
    decideBudgetStep,
    resubmitBudget,
    setBudgetDisbursed,
    materialRequests,
    materialRequestForTask,
    currentMaterialRequestApproverId,
    submitMaterialRequest,
    decideMaterialRequestStep,
    resubmitMaterialRequest,
    sendMaterialRequestToProcurement,
    procurementItems,
    requisitions,
    budgetCommitted,
    addProcurementItem,
    setProcurementStatus,
    submitRequisition,
    decideRequisition,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}

type ActivityAction = import("./mock-data").ActivityAction;
