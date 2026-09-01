import { useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Download,
  Eye,
  FileSignature,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
  UploadCloud,
  UserPlus,
  UserX,
  Users,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { DataTable, type Column, type FilterConfig } from "@/components/data-table";
import { UserAvatar } from "@/components/user-avatar";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspace } from "@/lib/workspace-store";
import {
  BANKS,
  DEGREES,
  EMPLOYMENT_GROUPS,
  GENDERS,
  MANAGER_ROLES,
  ORG_UNIT_LABELS,
  POSITIONS,
  POSITION_ROLE,
  STAFF_LEVELS,
  USER_FUNCTIONS,
  type Member,
  type OrgUnitType,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "User Management — TaskFlow" },
      {
        name: "description",
        content: "Add and manage staff users across your institution.",
      },
    ],
  }),
  component: UserManagement,
});

type UnitKind = "institution" | OrgUnitType;

interface UserFormState {
  name: string;
  email: string;
  phone: string;
  position: string;
  unitKind: UnitKind;
  orgUnitId: string;
  staffLevel: string;
  userFunction: string;
  employeeId: string;
  gender: string;
  dateOfBirth: string;
  rssbNo: string;
  employmentDate: string;
  employmentGroup: string;
  degree: string;
  qualification: string;
  bankName: string;
  bankAccount: string;
}

const EMPTY_FORM: UserFormState = {
  name: "",
  email: "",
  phone: "",
  position: "",
  unitKind: "institution",
  orgUnitId: "",
  staffLevel: "",
  userFunction: "",
  employeeId: "",
  gender: "",
  dateOfBirth: "",
  rssbNo: "",
  employmentDate: "",
  employmentGroup: "",
  degree: "",
  qualification: "",
  bankName: "",
  bankAccount: "",
};

const UNIT_KIND_OPTIONS: Array<{ value: UnitKind; label: string }> = [
  { value: "institution", label: "Institution (no specific unit)" },
  { value: "campus", label: "Campus" },
  { value: "college", label: "College" },
  { value: "school", label: "School" },
  { value: "center", label: "Center" },
  { value: "department", label: "Department" },
];

const REQUIRED_FIELDS: Array<{ key: keyof UserFormState; label: string }> = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "position", label: "Position" },
  { key: "employeeId", label: "Employee ID" },
  { key: "gender", label: "Gender" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "rssbNo", label: "RSSB No" },
  { key: "employmentDate", label: "Employment date" },
  { key: "employmentGroup", label: "Employment group" },
  { key: "degree", label: "Degree" },
  { key: "qualification", label: "Qualification" },
];

function validateForm(form: UserFormState): string[] {
  const missing = REQUIRED_FIELDS.filter(({ key }) => !String(form[key]).trim()).map(
    (f) => f.label,
  );
  if (form.unitKind !== "institution" && !form.orgUnitId) {
    missing.push(ORG_UNIT_LABELS[form.unitKind]);
  }
  return missing;
}

/** Radix Select's `value` prop can't be explicitly undefined under exactOptionalPropertyTypes — omit it entirely when empty so the placeholder shows. */
function selectProps(value: string) {
  return value ? { value } : {};
}

function hrPayload(form: UserFormState) {
  return {
    position: form.position,
    employeeId: form.employeeId,
    gender: form.gender,
    dateOfBirth: form.dateOfBirth,
    rssbNo: form.rssbNo,
    employmentDate: form.employmentDate,
    employmentGroup: form.employmentGroup,
    degree: form.degree,
    qualification: form.qualification,
    ...(form.staffLevel ? { staffLevel: form.staffLevel } : {}),
    ...(form.userFunction ? { userFunction: form.userFunction } : {}),
    ...(form.bankName ? { bankName: form.bankName } : {}),
    ...(form.bankAccount ? { bankAccount: form.bankAccount } : {}),
  };
}

interface BulkRow {
  key: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  unitKind: UnitKind;
  orgUnitId: string;
  staffLevel: string;
  userFunction: string;
  employeeId: string;
  gender: string;
  dateOfBirth: string;
  rssbNo: string;
  employmentDate: string;
  employmentGroup: string;
  degree: string;
  qualification: string;
  bankName: string;
  bankAccount: string;
}

const BULK_HEADERS = [
  "Name",
  "Email",
  "Phone",
  "Position",
  "Unit Type",
  "Unit Name",
  "Staff Level",
  "User Function",
  "Employee ID",
  "Gender",
  "Date of Birth (YYYY-MM-DD)",
  "RSSB No",
  "Employment Date (YYYY-MM-DD)",
  "Employment Group",
  "Degree",
  "Qualification",
  "Bank Name",
  "Bank Account",
];

function UserManagement() {
  const {
    members,
    orgUnits,
    orgUnitById,
    orgUnitPath,
    can,
    addMember,
    updateMember,
    setMemberActive,
    deleteMember,
  } = useWorkspace();
  const navigate = useNavigate();
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const todayStr = new Date().toISOString().slice(0, 10);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<UserFormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState<UserFormState>(EMPTY_FORM);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStep, setBulkStep] = useState<"upload" | "review">("upload");
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const canManage = can("manageTeam");

  const isComplete = (m: Member) => m.orgUnitId !== null;
  const unitTypeLabel = (m: Member) => {
    if (!m.orgUnitId) return "INSTITUTION";
    const unit = orgUnitById(m.orgUnitId);
    return unit ? ORG_UNIT_LABELS[unit.type].toUpperCase() : "INSTITUTION";
  };

  const activeCount = members.filter((m) => m.active).length;
  const inactiveCount = members.length - activeCount;
  const needsAttentionCount = members.filter((m) => !isComplete(m)).length;

  const closeBulk = () => {
    setBulkOpen(false);
    setBulkStep("upload");
    setBulkRows([]);
    if (bulkFileInputRef.current) bulkFileInputRef.current.value = "";
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    const unit = m.orgUnitId ? orgUnitById(m.orgUnitId) : undefined;
    setEditForm({
      name: m.name,
      email: m.email,
      phone: m.phone,
      position: m.position ?? m.title,
      unitKind: unit ? unit.type : "institution",
      orgUnitId: m.orgUnitId ?? "",
      staffLevel: m.staffLevel ?? "",
      userFunction: m.userFunction ?? "",
      employeeId: m.employeeId ?? "",
      gender: m.gender ?? "",
      dateOfBirth: m.dateOfBirth ?? "",
      rssbNo: m.rssbNo ?? "",
      employmentDate: m.employmentDate ?? "",
      employmentGroup: m.employmentGroup ?? "",
      degree: m.degree ?? "",
      qualification: m.qualification ?? "",
      bankName: m.bankName ?? "",
      bankAccount: m.bankAccount ?? "",
    });
  };

  const submitAdd = () => {
    const missing = validateForm(addForm);
    if (missing.length > 0) {
      toast.error("Missing required fields", { description: missing.join(", ") });
      return;
    }
    addMember({
      name: addForm.name.trim(),
      email: addForm.email.trim(),
      phone: addForm.phone.trim(),
      role: POSITION_ROLE[addForm.position] ?? "staff",
      orgUnitId: addForm.unitKind === "institution" ? null : addForm.orgUnitId,
      title: addForm.position,
      ...hrPayload(addForm),
    });
    setAddForm(EMPTY_FORM);
    setAddOpen(false);
  };

  const submitEdit = () => {
    if (!editing) return;
    const missing = validateForm(editForm);
    if (missing.length > 0) {
      toast.error("Missing required fields", { description: missing.join(", ") });
      return;
    }
    updateMember(editing.id, {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      title: editForm.position,
      orgUnitId: editForm.unitKind === "institution" ? null : editForm.orgUnitId,
      ...hrPayload(editForm),
    });
    setEditing(null);
  };

  const downloadTemplate = () => {
    const usersSheet = XLSX.utils.aoa_to_sheet([BULK_HEADERS]);
    const refColumns: Array<[string, string[]]> = [
      ["Positions", POSITIONS],
      ["Unit Types", ["Institution", ...Object.values(ORG_UNIT_LABELS)]],
      ["Campuses", orgUnits.filter((u) => u.type === "campus").map((u) => u.name)],
      ["Colleges", orgUnits.filter((u) => u.type === "college").map((u) => u.name)],
      ["Schools", orgUnits.filter((u) => u.type === "school").map((u) => u.name)],
      ["Centers", orgUnits.filter((u) => u.type === "center").map((u) => u.name)],
      ["Departments", orgUnits.filter((u) => u.type === "department").map((u) => u.name)],
      ["Staff Levels", STAFF_LEVELS],
      ["User Functions", USER_FUNCTIONS],
      ["Employment Groups", EMPLOYMENT_GROUPS],
      ["Degrees", DEGREES],
      ["Banks", BANKS],
      ["Genders", GENDERS],
    ];
    const maxLen = Math.max(...refColumns.map(([, values]) => values.length));
    const refRows: string[][] = [refColumns.map(([label]) => label)];
    for (let i = 0; i < maxLen; i++) {
      refRows.push(refColumns.map(([, values]) => values[i] ?? ""));
    }
    const refSheet = XLSX.utils.aoa_to_sheet(refRows);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, usersSheet, "Users");
    XLSX.utils.book_append_sheet(workbook, refSheet, "Reference");
    XLSX.writeFile(workbook, "users-bulk-upload-template.xlsx");
    toast.success("Template downloaded");
  };

  const resolveUnit = (
    unitTypeRaw: string,
    unitNameRaw: string,
  ): { unitKind: UnitKind; orgUnitId: string } => {
    const t = unitTypeRaw.trim().toLowerCase();
    const match = (Object.entries(ORG_UNIT_LABELS) as Array<[OrgUnitType, string]>).find(
      ([, label]) => label.toLowerCase() === t,
    );
    if (!match || !unitNameRaw.trim()) return { unitKind: "institution", orgUnitId: "" };
    const [type] = match;
    const unit = orgUnits.find(
      (u) => u.type === type && u.name.trim().toLowerCase() === unitNameRaw.trim().toLowerCase(),
    );
    return { unitKind: type, orgUnitId: unit?.id ?? "" };
  };

  const handleBulkFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames.includes("Users") ? "Users" : workbook.SheetNames[0];
        const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
        if (!sheet) throw new Error("No sheet found");
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        const rows: BulkRow[] = raw
          .map((r, i) => {
            const get = (key: string) => String(r[key] ?? "").trim();
            const { unitKind, orgUnitId } = resolveUnit(get("Unit Type"), get("Unit Name"));
            return {
              key: `bulk-${i}`,
              name: get("Name"),
              email: get("Email"),
              phone: get("Phone"),
              position: get("Position"),
              unitKind,
              orgUnitId,
              staffLevel: get("Staff Level"),
              userFunction: get("User Function"),
              employeeId: get("Employee ID"),
              gender: get("Gender"),
              dateOfBirth: get("Date of Birth (YYYY-MM-DD)") || get("Date of Birth"),
              rssbNo: get("RSSB No"),
              employmentDate: get("Employment Date (YYYY-MM-DD)") || get("Employment Date"),
              employmentGroup: get("Employment Group"),
              degree: get("Degree"),
              qualification: get("Qualification"),
              bankName: get("Bank Name"),
              bankAccount: get("Bank Account"),
            };
          })
          .filter((r) => r.name || r.email);
        if (rows.length === 0) {
          toast.error("No rows found", {
            description: "Check the Users sheet has data below the header row.",
          });
          return;
        }
        setBulkRows(rows);
        setBulkStep("review");
      } catch {
        toast.error("Couldn't read this file", {
          description: "Make sure it's an .xlsx or .xls file based on the downloaded template.",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const bulkRowIssue = (row: BulkRow, seenEmails: Set<string>): string | null => {
    if (!row.name.trim()) return "Missing name";
    if (!row.email.trim()) return "Missing email";
    if (!row.phone.trim()) return "Missing phone";
    if (!row.position.trim()) return "Missing position";
    if (row.unitKind !== "institution" && !row.orgUnitId) return "Unit not found";
    if (!row.employeeId.trim()) return "Missing employee ID";
    if (!row.gender.trim()) return "Missing gender";
    if (!row.dateOfBirth.trim()) return "Missing date of birth";
    if (!row.rssbNo.trim()) return "Missing RSSB No";
    if (!row.employmentDate.trim()) return "Missing employment date";
    if (!row.employmentGroup.trim()) return "Missing employment group";
    if (!row.degree.trim()) return "Missing degree";
    if (!row.qualification.trim()) return "Missing qualification";
    const email = row.email.trim().toLowerCase();
    if (members.some((m) => m.email.toLowerCase() === email)) return "Email already exists";
    if (seenEmails.has(email)) return "Duplicate email in file";
    return null;
  };

  const bulkIssues = useMemo(() => {
    const seen = new Set<string>();
    return bulkRows.map((row) => {
      const issue = bulkRowIssue(row, seen);
      if (!issue) seen.add(row.email.trim().toLowerCase());
      return issue;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkRows, members]);

  const updateBulkRow = (index: number, patch: Partial<BulkRow>) => {
    setBulkRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const createBulkUsers = () => {
    let created = 0;
    const seen = new Set<string>();
    for (const row of bulkRows) {
      const issue = bulkRowIssue(row, seen);
      if (issue) continue;
      seen.add(row.email.trim().toLowerCase());
      addMember({
        name: row.name.trim(),
        email: row.email.trim(),
        phone: row.phone.trim(),
        role: POSITION_ROLE[row.position] ?? "staff",
        orgUnitId: row.unitKind === "institution" ? null : row.orgUnitId,
        title: row.position,
        position: row.position,
        employeeId: row.employeeId,
        gender: row.gender,
        dateOfBirth: row.dateOfBirth,
        rssbNo: row.rssbNo,
        employmentDate: row.employmentDate,
        employmentGroup: row.employmentGroup,
        degree: row.degree,
        qualification: row.qualification,
        ...(row.staffLevel ? { staffLevel: row.staffLevel } : {}),
        ...(row.userFunction ? { userFunction: row.userFunction } : {}),
        ...(row.bankName ? { bankName: row.bankName } : {}),
        ...(row.bankAccount ? { bankAccount: row.bankAccount } : {}),
      });
      created += 1;
    }
    const skipped = bulkRows.length - created;
    toast.success(`${created} user${created === 1 ? "" : "s"} created`, {
      description:
        skipped > 0
          ? `${skipped} row${skipped === 1 ? "" : "s"} skipped due to missing or invalid data.`
          : "All rows imported successfully.",
    });
    closeBulk();
  };

  const columns: Array<Column<Member>> = [
    {
      key: "index",
      header: "#",
      className: "w-10 text-muted-foreground",
      render: (m) => members.findIndex((x) => x.id === m.id) + 1,
      exportValue: (m) => members.findIndex((x) => x.id === m.id) + 1,
    },
    {
      key: "name",
      header: "Name",
      render: (m) => (
        <div
          className="flex items-center gap-3 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            navigate({ to: "/member/$memberId", params: { memberId: m.id } });
          }}
        >
          <UserAvatar member={m} />
          <span className="font-medium text-foreground">{m.name}</span>
        </div>
      ),
      exportValue: (m) => m.name,
    },
    { key: "email", header: "Email", render: (m) => m.email, exportValue: (m) => m.email },
    { key: "phone", header: "Phone", render: (m) => m.phone || "—", exportValue: (m) => m.phone },
    {
      key: "position",
      header: "Position",
      render: (m) => m.position ?? m.title,
      exportValue: (m) => m.position ?? m.title,
    },
    {
      key: "actingFor",
      header: "Acting Staff",
      render: (m) => m.actingFor ?? "—",
      exportValue: (m) => m.actingFor ?? "",
    },
    {
      key: "unitType",
      header: "Unit Type",
      render: (m) => <Badge variant="outline">{unitTypeLabel(m)}</Badge>,
      exportValue: (m) => unitTypeLabel(m),
    },
    {
      key: "signature",
      header: "Signature",
      render: (m) =>
        m.hasSignature ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            <FileSignature className="size-3.5" /> Signature
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">No signature</span>
        ),
      exportValue: (m) => (m.hasSignature ? "Signature on file" : "No signature"),
    },
    {
      key: "missingInfo",
      header: "Missing Info",
      render: (m) =>
        isComplete(m) ? (
          <Badge variant="secondary" className="bg-success/12 text-success">
            Complete
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-destructive/12 text-destructive">
            Missing info
          </Badge>
        ),
      exportValue: (m) => (isComplete(m) ? "Complete" : "Missing info"),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (m) => new Date(m.createdAt).toLocaleDateString("en-US"),
      exportValue: (m) => m.createdAt,
    },
    {
      key: "active",
      header: "Active",
      render: (m) =>
        m.active ? (
          <Badge variant="secondary" className="bg-success/12 text-success">
            Active
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            Inactive
          </Badge>
        ),
      exportValue: (m) => (m.active ? "Active" : "Inactive"),
    },
    {
      key: "actions",
      header: "",
      className: "w-14",
      render: (m) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => navigate({ to: "/member/$memberId", params: { memberId: m.id } })}
              >
                <Eye className="size-3.5" /> View profile
              </DropdownMenuItem>
              {canManage && (
                <>
                  <DropdownMenuItem onClick={() => openEdit(m)}>
                    <Pencil className="size-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMemberActive(m.id, !m.active)}>
                    {m.active ? (
                      <>
                        <Ban className="size-3.5" /> Deactivate
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-3.5" /> Activate
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeletingId(m.id)}
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  const filters: Array<FilterConfig<Member>> = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
      match: (m, v) => (v === "active" ? m.active : !m.active),
    },
    {
      key: "campus",
      label: "Campus",
      options: orgUnits
        .filter((u) => u.type === "campus")
        .map((u) => ({ value: u.id, label: u.name })),
      match: (m, v) => orgUnitPath(m.orgUnitId).some((u) => u.id === v),
    },
    {
      key: "college",
      label: "College",
      options: orgUnits
        .filter((u) => u.type === "college")
        .map((u) => ({ value: u.id, label: u.name })),
      match: (m, v) => orgUnitPath(m.orgUnitId).some((u) => u.id === v),
    },
    {
      key: "school",
      label: "School",
      options: orgUnits
        .filter((u) => u.type === "school")
        .map((u) => ({ value: u.id, label: u.name })),
      match: (m, v) => orgUnitPath(m.orgUnitId).some((u) => u.id === v),
    },
    {
      key: "department",
      label: "Department",
      options: orgUnits
        .filter((u) => u.type === "department")
        .map((u) => ({ value: u.id, label: u.name })),
      match: (m, v) => orgUnitPath(m.orgUnitId).some((u) => u.id === v),
    },
  ];

  const renderForm = (form: UserFormState, setForm: (f: UserFormState) => void) => {
    const unitsOfKind =
      form.unitKind === "institution" ? [] : orgUnits.filter((u) => u.type === form.unitKind);
    const unitLabel = form.unitKind === "institution" ? "" : ORG_UNIT_LABELS[form.unitKind];

    return (
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Name *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label>Email *</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label>Phone *</Label>
          <Input
            placeholder="+2507xxxxxxx"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label>Position *</Label>
          <Select
            {...selectProps(form.position)}
            onValueChange={(v) => setForm({ ...form, position: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select position" />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Unit Type</Label>
          <Select
            value={form.unitKind}
            onValueChange={(v) => setForm({ ...form, unitKind: v as UnitKind, orgUnitId: "" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select unit type" />
            </SelectTrigger>
            <SelectContent>
              {UNIT_KIND_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {form.unitKind !== "institution" && (
          <div className="grid gap-2">
            <Label>{unitLabel} *</Label>
            <Select
              {...selectProps(form.orgUnitId)}
              onValueChange={(v) => setForm({ ...form, orgUnitId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${unitLabel.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {unitsOfKind.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid gap-2">
          <Label>Staff Level (Function)</Label>
          <Select
            {...selectProps(form.staffLevel)}
            onValueChange={(v) => setForm({ ...form, staffLevel: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select staff level" />
            </SelectTrigger>
            <SelectContent>
              {STAFF_LEVELS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>User Function (optional)</Label>
          <Select
            {...selectProps(form.userFunction)}
            onValueChange={(v) => setForm({ ...form, userFunction: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select user function" />
            </SelectTrigger>
            <SelectContent>
              {USER_FUNCTIONS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Employee ID *</Label>
          <Input
            placeholder="Employee ID"
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label>Gender *</Label>
          <Select
            {...selectProps(form.gender)}
            onValueChange={(v) => setForm({ ...form, gender: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Date of Birth *</Label>
          <Input
            type="date"
            max={todayStr}
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Format: YYYY-MM-DD. Future dates are disabled.
          </p>
        </div>
        <div className="grid gap-2">
          <Label>RSSB No *</Label>
          <Input
            value={form.rssbNo}
            onChange={(e) => setForm({ ...form, rssbNo: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label>Employment Date *</Label>
          <Input
            type="date"
            max={todayStr}
            value={form.employmentDate}
            onChange={(e) => setForm({ ...form, employmentDate: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Format: YYYY-MM-DD. Future dates are disabled.
          </p>
        </div>
        <div className="grid gap-2">
          <Label>Employment Group *</Label>
          <Select
            {...selectProps(form.employmentGroup)}
            onValueChange={(v) => setForm({ ...form, employmentGroup: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select group" />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_GROUPS.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Degree *</Label>
          <Select
            {...selectProps(form.degree)}
            onValueChange={(v) => setForm({ ...form, degree: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select degree" />
            </SelectTrigger>
            <SelectContent>
              {DEGREES.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Qualification *</Label>
          <Input
            value={form.qualification}
            onChange={(e) => setForm({ ...form, qualification: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label>Bank Name</Label>
          <Select
            {...selectProps(form.bankName)}
            onValueChange={(v) => setForm({ ...form, bankName: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select bank" />
            </SelectTrigger>
            <SelectContent>
              {BANKS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Bank Account</Label>
          <Input
            placeholder="Enter bank account number"
            value={form.bankAccount}
            onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
          />
        </div>
      </div>
    );
  };

  return (
    <AppShell
      allowedRoles={["admin", ...MANAGER_ROLES]}
      title="User Management"
      description="Add and manage staff users across your institution."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => toast.success("User list refreshed")}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          {canManage && (
            <>
              <Button variant="outline" onClick={() => setBulkOpen(true)}>
                <Upload className="size-4" /> Bulk Upload
              </Button>
              <Button onClick={() => setAddOpen(true)}>
                <UserPlus className="size-4" /> Add User
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          title="Total Users"
          value={members.length}
          hint="All users in the system"
          tone="brand"
        />
        <StatCard
          icon={CheckCircle2}
          title="Active Users"
          value={activeCount}
          hint="Currently active"
          tone="success"
        />
        <StatCard
          icon={UserX}
          title="Inactive Users"
          value={inactiveCount}
          hint="Deactivated accounts"
          tone="soft"
        />
        <StatCard
          icon={AlertTriangle}
          title="Needs Attention"
          value={needsAttentionCount}
          hint="Missing unit, campus, college, school, center, department, level, or function"
          tone={needsAttentionCount > 0 ? "warning" : "success"}
        />
      </div>

      <DataTable
        rows={members}
        columns={columns}
        getRowId={(m) => m.id}
        searchFields={(m) => `${m.name} ${m.email} ${m.phone}`}
        searchPlaceholder="Search users by name, email, or phone..."
        filters={filters}
        paginate
        exportFileName="users"
        emptyMessage="No users match your filters."
      />

      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) setAddForm(EMPTY_FORM);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Signs in with the shared demo password.</DialogDescription>
          </DialogHeader>
          {renderForm(addForm, setAddForm)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitAdd}>Add user</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          {renderForm(editForm, setEditForm)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={submitEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={(o) => (o ? setBulkOpen(true) : closeBulk())}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Upload Users</DialogTitle>
            <DialogDescription>
              Download the Excel template, fill in user details, upload the file, then review and
              edit rows in the table before creating users.
            </DialogDescription>
          </DialogHeader>

          {bulkStep === "upload" ? (
            <div className="grid gap-4">
              <div className="flex gap-3 rounded-lg border p-4">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                  1
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-foreground">Download template</p>
                  <p className="text-xs text-muted-foreground">
                    Includes positions, campuses, schools, and other values from your database.
                  </p>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="size-3.5" /> Download Template
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 rounded-lg border p-4">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                  2
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-foreground">Upload filled template</p>
                  <div
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                      dragActive ? "border-primary bg-primary-soft" : "border-border",
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleBulkFile(file);
                    }}
                    onClick={() => bulkFileInputRef.current?.click()}
                  >
                    <UploadCloud className="mx-auto size-8 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium text-foreground">
                      Drag & drop your Excel file
                    </p>
                    <p className="text-xs text-muted-foreground">or click to browse</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      .xlsx, .xls — filled Users sheet from the template
                    </p>
                    <input
                      ref={bulkFileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleBulkFile(file);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="min-w-0 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {bulkRows.length} row{bulkRows.length === 1 ? "" : "s"} parsed —{" "}
                  {bulkIssues.filter(Boolean).length} need attention
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBulkRows([]);
                    setBulkStep("upload");
                  }}
                >
                  <Upload className="size-3.5" /> Re-upload
                </Button>
              </div>
              <div className="max-h-[45vh] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkRows.map((row, i) => {
                      const issue = bulkIssues[i];
                      return (
                        <TableRow key={row.key}>
                          <TableCell>
                            <Input
                              className="h-8 min-w-[9rem]"
                              value={row.name}
                              onChange={(e) => updateBulkRow(i, { name: e.target.value })}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 min-w-[11rem]"
                              value={row.email}
                              onChange={(e) => updateBulkRow(i, { email: e.target.value })}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 min-w-[8rem]"
                              value={row.phone}
                              onChange={(e) => updateBulkRow(i, { phone: e.target.value })}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              {...selectProps(row.position)}
                              onValueChange={(v) => updateBulkRow(i, { position: v })}
                            >
                              <SelectTrigger className="h-8 min-w-[9rem]">
                                <SelectValue placeholder="Select position" />
                              </SelectTrigger>
                              <SelectContent>
                                {POSITIONS.map((p) => (
                                  <SelectItem key={p} value={p}>
                                    {p}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {row.unitKind === "institution"
                              ? "Institution"
                              : (orgUnitById(row.orgUnitId)?.name ??
                                `${ORG_UNIT_LABELS[row.unitKind]} not found`)}
                          </TableCell>
                          <TableCell>
                            {issue ? (
                              <Badge
                                variant="secondary"
                                className="bg-destructive/12 text-destructive"
                              >
                                {issue}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-success/12 text-success">
                                Ready
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() =>
                                setBulkRows((prev) => prev.filter((_, idx) => idx !== i))
                              }
                            >
                              <X className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeBulk}>
              Cancel
            </Button>
            {bulkStep === "review" && (
              <Button
                onClick={createBulkUsers}
                disabled={bulkIssues.filter((i) => !i).length === 0}
              >
                Create {bulkIssues.filter((i) => !i).length} User
                {bulkIssues.filter((i) => !i).length === 1 ? "" : "s"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
        title="Delete this user?"
        description="Reassign their open tasks and unit management before deleting."
        onConfirm={() => {
          if (deletingId) deleteMember(deletingId);
          setDeletingId(null);
        }}
      />
    </AppShell>
  );
}
