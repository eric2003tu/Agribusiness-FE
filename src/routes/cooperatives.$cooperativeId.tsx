import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BadgeCheck,
  CalendarDays,
  Loader2,
  Mail,
  MapPinned,
  MessageCircle,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiList } from "@/hooks/use-api-list";
import { apiErrorMessage, apiFieldErrors, ApiError } from "@/lib/api/client";
import { listAddressesApi, listContactsApi } from "@/lib/api/contacts";
import {
  createOrganizationMemberApi,
  getOrganizationApi,
  listOrganizationMembersApi,
  listOrganizationTypesApi,
  patchOrganizationApi,
} from "@/lib/api/organizations";
import { listLocationsApi } from "@/lib/api/reference";
import type {
  AddressType,
  ApiLocation,
  ApiOrganizationFull,
  ContactType,
  OrganizationStatus,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cooperatives/$cooperativeId")({
  head: () => ({ meta: [{ title: "Cooperative — Agribridge" }] }),
  component: CooperativeDetail,
});

const ORG_STATUS_LABELS: Record<OrganizationStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  deleted: "Deleted",
};

const ORG_STATUS_STYLES: Record<OrganizationStatus, string> = {
  active: "bg-success/12 text-success",
  suspended: "bg-destructive/12 text-destructive",
  deleted: "bg-muted text-muted-foreground",
};

const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  billing: "Billing",
  pickup: "Pickup",
  farm: "Farm",
  warehouse: "Warehouse",
};

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  phone: "Phone",
  whatsapp: "WhatsApp",
  email: "Email",
};

function OrgStatusBadge({ status }: { status: OrganizationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        ORG_STATUS_STYLES[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {ORG_STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function CooperativeDetail() {
  const { cooperativeId } = Route.useParams();
  const id = /^\d+$/.test(cooperativeId) ? Number(cooperativeId) : null;
  const typesList = useApiList(() => listOrganizationTypesApi({ page_size: 100 }), []);
  const membersList = useApiList(
    () => listOrganizationMembersApi({ organization: id ?? 0, page_size: 200 }),
    [id],
  );
  const reloadMembers = membersList.reload;
  const locationsList = useApiList(() => listLocationsApi({ page_size: 200 }), []);

  const types = typesList.items;
  const locations = locationsList.items;
  const members = membersList.items.filter((m) => m.organization === id);

  const typeName = (tid: number) => types.find((t) => t.id === tid)?.name ?? `#${tid}`;

  const [org, setOrg] = useState<ApiOrganizationFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);

  const load = () => {
    if (id === null) return Promise.resolve();
    setLoading(true);
    setError("");
    return getOrganizationApi(id)
      .then(setOrg)
      .catch((err: unknown) => {
        setOrg(null);
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

  if (id === null) {
    return (
      <AppShell title="Cooperative not found">
        <BackLink />
        <div className="surface-card p-10 text-center text-sm text-muted-foreground">
          This isn't a valid organization id.
        </div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell title="Cooperative">
        <BackLink />
        <div className="surface-card flex items-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading organization…
        </div>
      </AppShell>
    );
  }

  if (!org) {
    return (
      <AppShell title="Cooperative not found">
        <BackLink />
        <div className="surface-card flex flex-wrap items-center gap-3 p-10 text-sm text-destructive">
          <span className="min-w-0 flex-1">{error || "This organization doesn't exist."}</span>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Retry
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={org.name} description={`${typeName(org.organization_type)} · #${org.id}`}>
      <BackLink />

      <section className="surface-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
            {(org.name || "?")
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-foreground">{org.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{typeName(org.organization_type)}</Badge>
              <OrgStatusBadge status={org.status} />
              {org.is_verified && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-xs font-medium text-success whitespace-nowrap">
                  <BadgeCheck className="size-3.5" /> Verified
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          title="Members"
          value={members.length}
          tone="brand"
          hint="Staff-visible only"
        />
        <StatCard
          icon={ShieldCheck}
          title="Reliability score"
          value={org.reliability_score}
          tone="soft"
          hint="0–100 scale"
        />
        <StatCard
          icon={CalendarDays}
          title="Founded"
          value={org.founded_date ? new Date(org.founded_date).getUTCFullYear() : "—"}
          tone="success"
          hint={org.founded_date ? formatDate(org.founded_date) : "Not recorded"}
        />
        <StatCard
          icon={Activity}
          title="Status"
          value={ORG_STATUS_LABELS[org.status]}
          tone={
            org.status === "suspended" ? "warning" : org.status === "active" ? "success" : "soft"
          }
        />
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
          <TabsTrigger value="contacts">Contacts & addresses</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <DetailCard
              className="lg:col-span-2"
              title="Organization details"
              fields={[
                { label: "Registration number", value: org.registration_number ?? "—" },
                { label: "Tax id", value: org.tax_id ?? "—" },
                {
                  label: "Primary location",
                  value:
                    org.primary_location != null
                      ? (locations.find((l) => l.id === org.primary_location)?.name ??
                        `#${org.primary_location}`)
                      : "—",
                },
                {
                  label: "Primary contact",
                  value:
                    org.primary_contact_user != null ? `User #${org.primary_contact_user}` : "—",
                },
                { label: "Founded", value: formatDate(org.founded_date) },
                { label: "Reliability score", value: org.reliability_score },
                { label: "Created", value: formatDate(org.created_at) },
              ]}
            />

            <section className="surface-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Verification</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium text-foreground">
                    <OrgStatusBadge status={org.status} />
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Verified</dt>
                  <dd className="font-medium text-foreground">{org.is_verified ? "Yes" : "No"}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    patchOrganizationApi(org.id, { is_verified: !org.is_verified })
                      .then((res) => setOrg(res))
                      .finally(() => setBusy(false));
                  }}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                  {org.is_verified ? "Unverify" : "Verify"}
                </Button>
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <section className="surface-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Users className="size-4" /> Members ({members.length})
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Memberships are staff-only on the API, so they're hidden if your account lacks
                  staff access.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setMemberDialogOpen(true)}>
                <UserPlus className="size-4" /> Add member
              </Button>
            </div>
            {membersList.error && (
              <p className="mt-2 text-xs text-destructive">{membersList.error}</p>
            )}
            <ul className="mt-3 divide-y divide-border">
              {members.length === 0 && (
                <li className="py-4 text-sm text-muted-foreground">No memberships on record.</li>
              )}
              {members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                    U{m.user}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">User #{m.user}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.member_role || "Member"} · joined {formatDate(m.joined_at)}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/users/$userId" params={{ userId: String(m.user) }}>
                      View
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6">
          <ContactsAndAddresses organizationId={id} locations={locations} />
        </TabsContent>
      </Tabs>

      <AddMemberDialog
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        organizationId={id}
        onAdded={() => {
          setMemberDialogOpen(false);
          void reloadMembers();
        }}
      />
    </AppShell>
  );
}

function BackLink() {
  return (
    <div className="mt-4 mb-2">
      <Link to="/cooperatives" className="text-sm text-muted-foreground hover:underline">
        ← All organizations
      </Link>
    </div>
  );
}

function AddMemberDialog({
  open,
  onOpenChange,
  organizationId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number;
  onAdded: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setUserId("");
    setMemberRole("");
    setFormError("");
    setFieldErrors({});
  };

  const submit = () => {
    setFormError("");
    const errors: Record<string, string> = {};
    if (!/^\d+$/.test(userId)) {
      errors["user"] = "Enter the numeric user id.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    createOrganizationMemberApi({
      user: Number(userId),
      organization: organizationId,
      ...(memberRole.trim() ? { member_role: memberRole.trim() } : {}),
    })
      .then(() => {
        reset();
        onAdded();
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError) {
          setFormError(apiErrorMessage(err.body) ?? err.message);
          setFieldErrors(apiFieldErrors(err.body) ?? {});
        } else {
          setFormError("Could not reach the server.");
        }
      })
      .finally(() => setBusy(false));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>
            Attach a user to this organization. Requires staff access.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {formError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {formError}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="member-user">
              User id <span className="text-destructive">*</span>
            </Label>
            <Input
              id="member-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. 42"
              inputMode="numeric"
              disabled={busy}
            />
            {fieldErrors["user"] && (
              <p className="text-xs text-destructive">{fieldErrors["user"]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-role">Member role</Label>
            <Input
              id="member-role"
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
              placeholder="e.g. treasurer"
              disabled={busy}
            />
            {fieldErrors["member_role"] && (
              <p className="text-xs text-destructive">{fieldErrors["member_role"]}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Add member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailCard({
  title,
  fields,
  className,
}: {
  title: string;
  fields: Array<{ label: string; value: string }>;
  className?: string | undefined;
}) {
  return (
    <section className={cn("surface-card p-5", className)}>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label}>
            <dt className="text-muted-foreground">{f.label}</dt>
            <dd className="font-medium break-words text-foreground">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ContactsAndAddresses({
  organizationId,
  locations,
}: {
  organizationId: number;
  locations: ApiLocation[];
}) {
  const contactsList = useApiList(
    () => listContactsApi({ organization: organizationId, page_size: 200 }),
    [organizationId],
  );
  const addressesList = useApiList(
    () => listAddressesApi({ organization: organizationId, page_size: 200 }),
    [organizationId],
  );

  const contacts = contactsList.items;
  const addresses = addressesList.items;

  const locationName = (id: number | null) =>
    id != null ? (locations.find((l) => l.id === id)?.name ?? `#${id}`) : "—";

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Contacts ({contacts.length})</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Contact details are staff-only on the API, so they're hidden for non-staff accounts.
        </p>
        {contactsList.error && (
          <p className="mt-2 text-xs text-destructive">{contactsList.error}</p>
        )}
        <ul className="mt-3 divide-y divide-border">
          {contacts.length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">No contacts on record.</li>
          )}
          {contacts.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                {c.contact_type === "email" ? (
                  <Mail className="size-4" />
                ) : c.contact_type === "whatsapp" ? (
                  <MessageCircle className="size-4" />
                ) : (
                  <Phone className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{c.value}</p>
                <p className="truncate text-xs text-muted-foreground">
                  <Badge variant="secondary">{CONTACT_TYPE_LABELS[c.contact_type]}</Badge>
                  {c.is_primary && <span className="ml-1">· primary</span>}
                  {c.is_verified && <span className="ml-1 text-success">· verified</span>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Addresses ({addresses.length})</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Addresses are staff-only on the API, so they're hidden for non-staff accounts.
        </p>
        {addressesList.error && (
          <p className="mt-2 text-xs text-destructive">{addressesList.error}</p>
        )}
        <ul className="mt-3 divide-y divide-border">
          {addresses.length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">No addresses on record.</li>
          )}
          {addresses.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <MapPinned className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {a.street || locationName(a.location)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  <Badge variant="secondary">{ADDRESS_TYPE_LABELS[a.addr_type]}</Badge>
                  <span className="ml-1">· {locationName(a.location)}</span>
                  {a.is_default && <span className="ml-1">· default</span>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
