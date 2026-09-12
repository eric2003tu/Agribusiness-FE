import { useState } from "react";
import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import {
  Sprout,
  ShoppingBasket,
  Package,
  Users as UsersIcon,
  Loader2,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatCard } from "@/components/stat-card";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { DataTable, type Column } from "@/components/data-table";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { useApiList } from "@/hooks/use-api-list";
import {
  createUserApi,
  deleteUserApi,
  listUsersApi,
  patchUserApi,
  type UserCreatePayload,
} from "@/lib/api/users";
import { listLanguagesApi, listLocationsApi } from "@/lib/api/reference";
import { listOrganizationsApi } from "@/lib/api/organizations";
import { apiErrorMessage, apiFieldErrors, ApiError } from "@/lib/api/client";
import type { ApiRole, ApiUser, UserStatus } from "@/lib/api/types";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users — Agribridge" },
      { name: "description", content: "Staff-only account management across the marketplace." },
    ],
  }),
  component: UsersPage,
});

const API_ROLE_LABELS: Record<ApiRole, string> = {
  superadmin: "Super Admin",
  organization: "Organization",
  farmer: "Farmer",
  buyer: "Buyer",
  seller: "Seller",
};

function roleOf(u: ApiUser): ApiRole {
  return u.roles ?? "farmer";
}

function UsersPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(
    () => listUsersApi({ page_size: 50 }),
    [],
  );
  const [deleteTarget, setDeleteTarget] = useState<ApiUser | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  if (pathname !== "/users") {
    return <Outlet />;
  }

  const toastError = (err: unknown, fallback: string) => {
    const body = err instanceof ApiError ? err.body : null;
    void import("sonner").then(({ toast }) => toast.error(apiErrorMessage(body) ?? fallback));
  };

  const verify = async (u: ApiUser) => {
    setBusyId(u.id);
    try {
      await patchUserApi(u.id, { is_verified: !u.is_verified });
      await reload();
    } catch (err) {
      toastError(err, "Could not update verification status.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleSuspended = async (u: ApiUser) => {
    setBusyId(u.id);
    const next: UserStatus = u.status === "suspended" ? "active" : "suspended";
    try {
      await patchUserApi(u.id, { status: next });
      await reload();
    } catch (err) {
      toastError(err, "Could not update account status.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setBusyId(id);
    try {
      await deleteUserApi(id);
      await reload();
    } catch (err) {
      toastError(err, "Could not delete the account.");
    } finally {
      setBusyId(null);
    }
  };

  const columns: Column<ApiUser>[] = [
    { key: "name", header: "Name", render: (u) => u.full_name, exportValue: (u) => u.full_name },
    { key: "phone", header: "Phone", render: (u) => u.phone, exportValue: (u) => u.phone },
    {
      key: "email",
      header: "Email",
      render: (u) => u.email ?? "—",
      exportValue: (u) => u.email ?? "",
    },
    {
      key: "roles",
      header: "Role",
      render: (u) => <Badge variant="secondary">{API_ROLE_LABELS[roleOf(u)]}</Badge>,
      exportValue: (u) => API_ROLE_LABELS[roleOf(u)],
    },
    {
      key: "organization",
      header: "Organization",
      render: (u) => u.organization?.name ?? "—",
      exportValue: (u) => u.organization?.name ?? "",
    },
    {
      key: "location",
      header: "Location",
      render: (u) => u.primary_location?.name ?? "—",
      exportValue: (u) => u.primary_location?.name ?? "",
    },
    {
      key: "reliability",
      header: "Reliability",
      render: (u) => <ReliabilityBadge score={Number(u.reliability_score) || 0} />,
      exportValue: (u) => u.reliability_score,
    },
    {
      key: "verified",
      header: "Verified",
      render: (u) => (u.is_verified ? "Yes" : "No"),
      exportValue: (u) => (u.is_verified ? "yes" : "no"),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <Badge variant={u.status === "active" ? "secondary" : "destructive"}>
          {u.status === "active" ? "Active" : u.status === "suspended" ? "Suspended" : "Deleted"}
        </Badge>
      ),
      exportValue: (u) => u.status,
    },
    {
      key: "actions",
      header: "",
      render: (u) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busyId === u.id}
            onClick={() => void verify(u)}
          >
            {u.is_verified ? "Unverify" : "Verify"}
          </Button>
          <Button
            size="sm"
            variant={u.status === "suspended" ? "outline" : "destructive"}
            disabled={busyId === u.id || u.status === "deleted"}
            onClick={() => void toggleSuspended(u)}
          >
            {u.status === "suspended" ? "Reinstate" : "Suspend"}
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/users/$userId" params={{ userId: String(u.id) }}>
              View
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busyId === u.id}
            onClick={() => setDeleteTarget(u)}
          >
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  const farmers = items.filter((u) => roleOf(u) === "farmer").length;
  const buyers = items.filter((u) => roleOf(u) === "buyer").length;
  const sellers = items.filter((u) => roleOf(u) === "seller").length;

  return (
    <AppShell
      allowedRoles={["admin"]}
      title="Users"
      description="Every account on the Agribridge marketplace."
      actions={
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" /> Add user
        </Button>
      }
    >
      {error && (
        <div className="surface-card flex flex-wrap items-center gap-3 border-destructive/40 p-4 text-sm text-destructive">
          <span className="min-w-0 flex-1">{error}</span>
          <Button size="sm" variant="outline" onClick={() => void reload()}>
            <RefreshCw className="size-4" /> Retry
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UsersIcon} title="Total users" value={items.length} tone="brand" />
        <StatCard icon={Sprout} title="Farmers" value={farmers} tone="soft" />
        <StatCard icon={ShoppingBasket} title="Buyers" value={buyers} tone="soft" />
        <StatCard icon={Package} title="Sellers" value={sellers} tone="soft" />
      </div>

      {loading ? (
        <div className="surface-card flex items-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading users…
        </div>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(u) => String(u.id)}
            searchFields={(u) =>
              `${u.full_name} ${u.phone} ${u.email ?? ""} ${u.national_id ?? ""}`
            }
            exportFileName="users"
            paginate
            searchPlaceholder="Search by name, phone, email or national id…"
            emptyMessage="No users yet."
          />
          {hasMore && (
            <div className="flex justify-center">
              <Button size="sm" variant="outline" onClick={() => void loadMore()}>
                Load more users
              </Button>
            </div>
          )}
        </>
      )}

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => {
          setAddOpen(false);
          void reload();
        }}
      />

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete ${deleteTarget?.full_name ?? "user"}?`}
        description="This permanently deletes the account and its personal data. This cannot be undone."
        onConfirm={() => void confirmDelete()}
      />
    </AppShell>
  );
}

function AddUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const languagesList = useApiList(() => listLanguagesApi({ page_size: 100 }), []);
  const locationsList = useApiList(() => listLocationsApi({ page_size: 200 }), []);
  const organizationsList = useApiList(() => listOrganizationsApi({ page_size: 100 }), []);

  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [languageId, setLanguageId] = useState("");
  const [locationId, setLocationId] = useState("none");
  const [organizationId, setOrganizationId] = useState("none");
  const [role, setRole] = useState<ApiRole>("farmer");
  const [status, setStatus] = useState<UserStatus>("active");
  const [isVerified, setIsVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});
    if (!phone.trim() || !fullName.trim() || !password.trim() || !languageId) return;

    const payload: UserCreatePayload = {
      phone: phone.trim(),
      full_name: fullName.trim(),
      password: password.trim(),
      preferred_language: Number(languageId),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(nationalId.trim() ? { national_id: nationalId.trim() } : {}),
      ...(locationId === "none" ? {} : { primary_location: Number(locationId) }),
      ...(organizationId === "none" ? {} : { organization: Number(organizationId) }),
      roles: role,
      status,
      is_verified: isVerified,
    };

    setBusy(true);
    try {
      await createUserApi(payload);
      onCreated();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not create the account.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (field: string) =>
    fieldErrors[field] ? (
      <p className="mt-1 text-xs text-destructive">{fieldErrors[field]}</p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a user</DialogTitle>
          <DialogDescription>
            Staff-only account creation — distinct from public self-registration; this never sends
            an OTP.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="grid gap-3">
          {formError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2507…"
              required
            />
            {fieldError("phone")}
          </div>

          <div className="grid gap-2">
            <Label>Full name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Farmer"
              required
            />
            {fieldError("full_name")}
          </div>

          <div className="grid gap-2">
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {fieldError("password")}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@…"
              />
              {fieldError("email")}
            </div>
            <div className="grid gap-2">
              <Label>National ID</Label>
              <Input value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
              {fieldError("national_id")}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Preferred language</Label>
              <Select value={languageId} onValueChange={setLanguageId}>
                <SelectTrigger>
                  <SelectValue placeholder={languagesList.loading ? "Loading…" : "Select"} />
                </SelectTrigger>
                <SelectContent>
                  {languagesList.items.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("preferred_language")}
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as ApiRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(API_ROLE_LABELS) as Array<[ApiRole, string]>).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              {fieldError("roles")}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Primary location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {locationsList.items.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("primary_location")}
            </div>
            <div className="grid gap-2">
              <Label>Organization</Label>
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {organizationsList.items.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("organization")}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as UserStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
              {fieldError("status")}
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm text-foreground">
              <Checkbox checked={isVerified} onCheckedChange={(v) => setIsVerified(v === true)} />
              Verified
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Add user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
