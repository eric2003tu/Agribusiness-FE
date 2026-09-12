import { useEffect, useState, type ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle, Loader2, Pencil, RefreshCw, Star } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { UserAvatar } from "@/components/user-avatar";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { ListingStatusBadge, TransactionStatusBadge } from "@/components/status-badge";
import { ProductIllustration } from "@/components/product-illustration";
import { useApiList } from "@/hooks/use-api-list";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity } from "@/lib/format";
import { locationLabel, productById, ROLE_LABELS } from "@/lib/mock-data";
import { getMeApi, getUserApi, patchUserApi, type UserWritePayload } from "@/lib/api/users";
import { listLanguagesApi, listLocationsApi } from "@/lib/api/reference";
import { listOrganizationsApi } from "@/lib/api/organizations";
import { apiErrorMessage, apiFieldErrors, ApiError } from "@/lib/api/client";
import type { ApiRole, ApiUser, UserStatus } from "@/lib/api/types";
import type { User } from "@/lib/mock-data";

export const Route = createFileRoute("/users/$userId")({
  head: () => ({ meta: [{ title: "User profile — Agribridge" }] }),
  component: UserDetail,
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

function UserDetail() {
  const { userId } = Route.useParams();
  const { users, currentUser } = useWorkspace();
  const mockUser = users.find((u) => u.id === userId);

  const numericId = /^\d+$/.test(userId) ? Number(userId) : null;

  if (numericId !== null) {
    return <ApiUserDetail id={numericId} />;
  }

  // Real (JWT) sessions map their server id as `api-<id>`. When the menu's
  // "Profile" link resolves to the logged-in user themselves, pull that profile
  // straight from `GET /users/me/` — the live server, not the localStorage
  // cache or the mock demo data.
  if (currentUser.id.startsWith("api-") && userId === currentUser.id) {
    return <MeProfile />;
  }

  if (!mockUser) {
    return (
      <AppShell title="User not found">
        <p className="text-sm text-muted-foreground">This user doesn't exist.</p>
      </AppShell>
    );
  }

  return <MockUserDetail user={mockUser} />;
}

/* ------------------------------- Own profile (live) ------------------------------- */

function MeProfile() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    return getMeApi()
      .then(setUser)
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? (apiErrorMessage(err.body) ?? err.message)
            : "Could not reach the server.",
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <AppShell title="My profile">
        <div className="surface-card flex items-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your profile…
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell title="My profile">
        <div className="surface-card flex flex-wrap items-center gap-3 p-10 text-sm text-destructive">
          <span className="min-w-0 flex-1">{error || "Couldn't load your profile."}</span>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Retry
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={user.full_name} description={user.phone}>
      <ProfileCard user={user} />
    </AppShell>
  );
}

/* ------------------------------- Real API user ------------------------------- */

function ApiUserDetail({ id }: { id: number }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    return getUserApi(id)
      .then(setUser)
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? (apiErrorMessage(err.body) ?? err.message)
            : "Could not reach the server.",
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runMod = (op: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    op().finally(() => setBusy(false));
  };

  if (loading) {
    return (
      <AppShell title="User profile">
        <div className="surface-card flex items-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading user…
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell title="User not found">
        <div className="surface-card flex flex-wrap items-center gap-3 p-10 text-sm text-destructive">
          <span className="min-w-0 flex-1">{error || "This user doesn't exist."}</span>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Retry
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={user.full_name} description={user.phone}>
      <ProfileCard
        user={user}
        actions={
          <AdminUserActions
            user={user}
            busy={busy}
            runMod={runMod}
            onMutated={(updated) => setUser(updated)}
            onEdit={() => setEditing(true)}
          />
        }
      />
      <EditUserDialog
        user={user}
        open={editing}
        onOpenChange={setEditing}
        onSaved={(updated) => setUser(updated)}
      />
    </AppShell>
  );
}

/* ------------------------- Shared API profile card ------------------------- */

function AdminUserActions({
  user,
  busy,
  runMod,
  onMutated,
  onEdit,
}: {
  user: ApiUser;
  busy: boolean;
  runMod: (op: () => Promise<unknown>) => void;
  onMutated: (user: ApiUser) => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-t border-border pt-4">
      <Button size="sm" variant="outline" disabled={busy} onClick={onEdit}>
        <Pencil className="size-4" /> Edit details
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() =>
          runMod(() =>
            patchUserApi(user.id, { is_verified: !user.is_verified }).then((res) => onMutated(res)),
          )
        }
      >
        {user.is_verified ? "Unverify" : "Verify"}
      </Button>
      <Button
        size="sm"
        variant={user.status === "suspended" ? "outline" : "destructive"}
        disabled={busy || user.status === "deleted"}
        onClick={() =>
          runMod(() =>
            patchUserApi(user.id, {
              status: user.status === "suspended" ? "active" : "suspended",
            }).then((res) => onMutated(res)),
          )
        }
      >
        {user.status === "suspended" ? "Reinstate" : "Suspend"}
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSaved,
}: {
  user: ApiUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (user: ApiUser) => void;
}) {
  const languagesList = useApiList(() => listLanguagesApi({ page_size: 100 }), []);
  const locationsList = useApiList(() => listLocationsApi({ page_size: 200 }), []);
  const organizationsList = useApiList(() => listOrganizationsApi({ page_size: 100 }), []);

  const [phone, setPhone] = useState(user.phone);
  const [fullName, setFullName] = useState(user.full_name);
  const [email, setEmail] = useState(user.email ?? "");
  const [nationalId, setNationalId] = useState(user.national_id ?? "");
  const [languageId, setLanguageId] = useState(
    user.preferred_language?.id ? String(user.preferred_language.id) : "",
  );
  const [locationId, setLocationId] = useState(
    user.primary_location?.id ? String(user.primary_location.id) : "none",
  );
  const [organizationId, setOrganizationId] = useState(
    user.organization?.id ? String(user.organization.id) : "none",
  );
  const [role, setRole] = useState<ApiRole>(user.roles ?? "farmer");
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [isVerified, setIsVerified] = useState(user.is_verified);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});
    if (!phone.trim() || !fullName.trim() || !languageId) return;

    const payload: Partial<UserWritePayload> = {
      phone: phone.trim(),
      full_name: fullName.trim(),
      preferred_language: Number(languageId),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(nationalId.trim() ? { national_id: nationalId.trim() } : {}),
      primary_location: locationId === "none" ? null : Number(locationId),
      organization: organizationId === "none" ? null : Number(organizationId),
      roles: role,
      status,
      is_verified: isVerified,
    };

    setBusy(true);
    try {
      const updated = await patchUserApi(user.id, payload);
      onSaved(updated);
      onOpenChange(false);
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not update the account.");
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
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Updating <strong>{user.full_name}</strong> ({user.phone}). Changes are saved to the live
            API.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="grid gap-3">
          {formError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
              {fieldError("phone")}
            </div>
            <div className="grid gap-2">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              {fieldError("full_name")}
            </div>
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
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProfileCard({ user, actions }: { user: ApiUser; actions?: ReactNode }) {
  return (
    <section className="surface-card p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
          {(user.full_name || "?")
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-foreground">{user.full_name}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge variant="secondary">{API_ROLE_LABELS[roleOf(user)]}</Badge>
            <Badge variant={user.status === "active" ? "outline" : "destructive"}>
              {user.status === "active"
                ? "Active"
                : user.status === "suspended"
                  ? "Suspended"
                  : "Deleted"}
            </Badge>
          </div>
        </div>
        <ReliabilityBadge score={Number(user.reliability_score) || 0} />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-medium text-foreground">{user.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">National ID</dt>
          <dd className="font-medium text-foreground">{user.national_id ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Language</dt>
          <dd className="font-medium text-foreground">{user.preferred_language?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Location</dt>
          <dd className="font-medium text-foreground">{user.primary_location?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Organization</dt>
          <dd className="font-medium text-foreground">{user.organization?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Member since</dt>
          <dd className="font-medium text-foreground">
            {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Verified</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-foreground">
            {user.is_verified ? (
              <CheckCircle2 className="size-4 text-success" />
            ) : (
              <Circle className="size-4 text-muted-foreground" />
            )}
            {user.is_verified ? "Yes" : "No"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last login</dt>
          <dd className="font-medium text-foreground">
            {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : "—"}
          </dd>
        </div>
      </dl>

      {actions}
    </section>
  );
}

/* ------------------------------- Mock user (demo) ------------------------------- */

function MockUserDetail({ user }: { user: User }) {
  const {
    produceListings,
    transactions,
    ratingsForUser,
    userById,
    cooperatives,
    verifyUser,
    setUserSuspended,
    can,
  } = useWorkspace();

  const listings = produceListings.filter((l) => l.sellerId === user.id);
  const userTransactions = transactions.filter(
    (t) => t.buyerId === user.id || t.sellerId === user.id,
  );
  const ratings = ratingsForUser(user.id);
  const cooperative = cooperatives.find((c) => c.id === user.cooperativeId);
  const averageRating =
    ratings.length > 0
      ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1)
      : null;

  return (
    <AppShell title={user.name} description={user.phone}>
      <div className="mt-4 mb-2">
        <Link to="/users" className="text-sm text-muted-foreground hover:underline">
          ← All users
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card p-5">
            <div className="flex items-center gap-3">
              <UserAvatar user={user} className="size-12 text-base" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-foreground">{user.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {user.roles.map((r) => (
                    <Badge key={r} variant="secondary">
                      {ROLE_LABELS[r]}
                    </Badge>
                  ))}
                  <Badge variant={user.status === "suspended" ? "destructive" : "outline"}>
                    {user.status === "suspended" ? "Suspended" : "Active"}
                  </Badge>
                </div>
              </div>
              <ReliabilityBadge score={user.reliabilityScore} />
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Location</dt>
                <dd className="font-medium text-foreground">{locationLabel(user.locationId)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Cooperative</dt>
                <dd className="font-medium text-foreground">{cooperative?.name ?? "None"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Member since</dt>
                <dd className="font-medium text-foreground">{user.createdAt}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Verified</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-foreground">
                  {user.isVerified ? (
                    <CheckCircle2 className="size-4 text-success" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground" />
                  )}
                  {user.isVerified ? "Yes" : "No"}
                </dd>
              </div>
            </dl>

            {can("moderate") && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => verifyUser(user.id, !user.isVerified)}
                >
                  {user.isVerified ? "Unverify" : "Verify"}
                </Button>
                <Button
                  size="sm"
                  variant={user.status === "suspended" ? "outline" : "destructive"}
                  onClick={() => setUserSuspended(user.id, user.status !== "suspended")}
                >
                  {user.status === "suspended" ? "Reinstate" : "Suspend"}
                </Button>
              </div>
            )}
          </section>

          {listings.length > 0 && (
            <section className="surface-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Listings</h2>
              <ul className="mt-3 divide-y divide-border">
                {listings.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                    <ProductIllustration
                      productId={l.productId}
                      className="size-10"
                      rounded="rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {productById(l.productId)?.name} — {formatQuantity(l.quantity, l.unit)}
                      </p>
                    </div>
                    <ListingStatusBadge status={l.status} />
                    <Button asChild size="sm" variant="outline">
                      <Link to="/listings/$listingId" params={{ listingId: l.id }}>
                        View
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Transaction history</h2>
            <ul className="mt-3 divide-y divide-border">
              {userTransactions.length === 0 && (
                <li className="py-4 text-sm text-muted-foreground">No transactions yet.</li>
              )}
              {userTransactions.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                  <ProductIllustration
                    productId={t.productId}
                    className="size-10"
                    rounded="rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {productById(t.productId)?.name} — {formatQuantity(t.quantity, t.unit)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.buyerId === user.id ? "As buyer" : "As seller"}
                    </p>
                  </div>
                  <TransactionStatusBadge status={t.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link to="/transactions/$transactionId" params={{ transactionId: t.id }}>
                      View
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Ratings received</h2>
            <ul className="mt-3 space-y-3">
              {ratings.length === 0 && (
                <li className="text-sm text-muted-foreground">No ratings yet.</li>
              )}
              {ratings.map((r) => {
                const reviewer = userById(r.ratedBy);
                return (
                  <li key={r.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <UserAvatar user={reviewer} className="size-6 text-[10px]" />
                      <p className="truncate text-xs font-medium text-foreground">
                        {reviewer?.name ?? "Unknown"}
                      </p>
                    </div>
                    <div className="mt-1.5 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`size-3.5 ${n <= r.score ? "fill-warning text-warning" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                    {r.comment && <p className="mt-1 text-xs text-muted-foreground">{r.comment}</p>}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Profile summary</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Listings</dt>
                <dd className="font-medium text-foreground">{listings.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Transactions</dt>
                <dd className="font-medium text-foreground">{userTransactions.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Average rating</dt>
                <dd className="font-medium text-foreground">
                  {averageRating ? `${averageRating} / 5` : "—"}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
