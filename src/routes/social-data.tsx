import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StaffAccessNotice } from "@/components/staff-access-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type Column } from "@/components/data-table";
import { useApiList } from "@/hooks/use-api-list";
import { apiErrorMessage, apiFieldErrors, ApiError } from "@/lib/api/client";
import { listOrganizationsApi } from "@/lib/api/organizations";
import { listOrdersApi } from "@/lib/api/orders";
import { listUsersApi } from "@/lib/api/users";
import {
  createReviewApi,
  deleteReviewApi,
  listReviewsApi,
  patchReviewApi,
  type ReviewCreatePayload,
} from "@/lib/api/reviews";
import {
  createMessageApi,
  createThreadApi,
  createThreadUserApi,
  deleteMessageApi,
  deleteThreadApi,
  deleteThreadUserApi,
  listMessagesApi,
  listThreadsApi,
  listThreadUsersApi,
  markThreadReadApi,
  patchMessageApi,
  patchThreadApi,
} from "@/lib/api/messaging";
import {
  createNotificationApi,
  deleteNotificationApi,
  listNotificationsApi,
  markNotificationReadApi,
  patchNotificationApi,
  type NotificationPayload,
} from "@/lib/api/notifications";
import type {
  ApiMessage,
  ApiNotification,
  ApiOrder,
  ApiOrganizationFull,
  ApiReview,
  ApiThread,
  ApiThreadUser,
  ApiUser,
  NotifChannel,
  NotifType,
} from "@/lib/api/types";

export const Route = createFileRoute("/social-data")({
  head: () => ({
    meta: [
      { title: "Social & messaging — Agribridge" },
      { name: "description", content: "Manage reviews, message threads and notifications on the live API." },
    ],
  }),
  component: SocialDataPage,
});

function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function LoadMoreButton({ hasMore, loadMore }: { hasMore: boolean; loadMore: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  if (!hasMore) return null;
  return (
    <div className="flex justify-center py-3">
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await loadMore();
          setBusy(false);
        }}
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        Load more from server
      </Button>
    </div>
  );
}

type OwnerKind = "user" | "organization";

function OwnerPicker({
  users,
  organizations,
  ownerKind,
  setOwnerKind,
  ownerId,
  setOwnerId,
  userLabel = "User",
  orgLabel = "Organization",
}: {
  users: ApiUser[];
  organizations: ApiOrganizationFull[];
  ownerKind: OwnerKind;
  setOwnerKind: (k: OwnerKind) => void;
  ownerId: string;
  setOwnerId: (id: string) => void;
  userLabel?: string;
  orgLabel?: string;
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label>{userLabel === "User" ? "Owner type" : `${userLabel}/${orgLabel} type`}</Label>
        <Select
          value={ownerKind}
          onValueChange={(v) => {
            setOwnerKind(v as OwnerKind);
            setOwnerId("");
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">{userLabel}</SelectItem>
            <SelectItem value="organization">{orgLabel}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>{ownerKind === "user" ? userLabel : orgLabel}</Label>
        <Select value={ownerId} onValueChange={setOwnerId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder={`Select ${ownerKind === "user" ? "a user" : "an organization"}`} />
          </SelectTrigger>
          <SelectContent>
            {ownerKind === "user"
              ? users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.full_name} ({u.phone})
                  </SelectItem>
                ))
              : organizations.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.name}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

/* --------------------------------- Reviews -------------------------------- */

function ReviewsTab({
  users,
  organizations,
  orders,
}: {
  users: ApiUser[];
  organizations: ApiOrganizationFull[];
  orders: ApiOrder[];
}) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listReviewsApi({ page_size: 50 }), []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [orderId, setOrderId] = useState("");
  const [reviewerKind, setReviewerKind] = useState<OwnerKind>("user");
  const [reviewerId, setReviewerId] = useState("");
  const [revieweeKind, setRevieweeKind] = useState<OwnerKind>("user");
  const [revieweeId, setRevieweeId] = useState("");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function startEdit(r: ApiReview) {
    setEditingId(r.id);
    setRating(String(r.rating));
    setComment(r.comment);
    setFormError("");
    setFieldErrors({});
  }
  function resetForm() {
    setEditingId(null);
    setOrderId("");
    setReviewerKind("user");
    setReviewerId("");
    setRevieweeKind("user");
    setRevieweeId("");
    setRating("5");
    setComment("");
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      if (!rating.trim()) return;
    } else if (!orderId || !reviewerId || !revieweeId || !rating.trim()) {
      return;
    }
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    try {
      if (editingId) {
        await patchReviewApi(editingId, { rating: Number(rating), ...(comment.trim() ? { comment: comment.trim() } : {}) });
      } else {
        const payload: ReviewCreatePayload = {
          order: Number(orderId),
          rating: Number(rating),
          ...(reviewerKind === "user" ? { reviewer_user: Number(reviewerId) } : { reviewer_org: Number(reviewerId) }),
          ...(revieweeKind === "user" ? { reviewee_user: Number(revieweeId) } : { reviewee_org: Number(revieweeId) }),
          ...(comment.trim() ? { comment: comment.trim() } : {}),
        };
        await createReviewApi(payload);
      }
      resetForm();
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteReviewApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  function partyLabel(userId: number | null, orgId: number | null) {
    if (userId) return users.find((u) => u.id === userId)?.full_name ?? `User #${userId}`;
    if (orgId) return organizations.find((o) => o.id === orgId)?.name ?? `Org #${orgId}`;
    return "—";
  }

  const columns: Column<ApiReview>[] = [
    {
      key: "order",
      header: "Order",
      render: (r) => orders.find((o) => o.id === r.order)?.order_number ?? `#${r.order}`,
      exportValue: (r) => orders.find((o) => o.id === r.order)?.order_number ?? "",
    },
    {
      key: "reviewer",
      header: "Reviewer",
      render: (r) => partyLabel(r.reviewer_user, r.reviewer_org),
      exportValue: (r) => partyLabel(r.reviewer_user, r.reviewer_org),
    },
    {
      key: "reviewee",
      header: "Reviewee",
      render: (r) => partyLabel(r.reviewee_user, r.reviewee_org),
      exportValue: (r) => partyLabel(r.reviewee_user, r.reviewee_org),
    },
    { key: "rating", header: "Rating", render: (r) => `${r.rating} / 5`, exportValue: (r) => r.rating },
    { key: "comment", header: "Comment", render: (r) => r.comment || "—", exportValue: (r) => r.comment },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(r.id)}>
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit review" : "Add a review"}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The server rejects a create until the order's delivery is fully confirmed by both parties.
        </p>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          {!editingId && (
            <>
              <div className="grid gap-2">
                <Label>Order</Label>
                <Select value={orderId} onValueChange={setOrderId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={orders.length ? "Select an order" : "No orders yet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.order_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors["order"] && <p className="text-xs text-destructive">{fieldErrors["order"]}</p>}
              </div>
              <OwnerPicker
                users={users}
                organizations={organizations}
                ownerKind={reviewerKind}
                setOwnerKind={setReviewerKind}
                ownerId={reviewerId}
                setOwnerId={setReviewerId}
                userLabel="Reviewer (user)"
                orgLabel="Reviewer (org)"
              />
              <OwnerPicker
                users={users}
                organizations={organizations}
                ownerKind={revieweeKind}
                setOwnerKind={setRevieweeKind}
                ownerId={revieweeId}
                setOwnerId={setRevieweeId}
                userLabel="Reviewee (user)"
                orgLabel="Reviewee (org)"
              />
            </>
          )}
          <div className="grid gap-2">
            <Label>Rating</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid min-w-[16rem] flex-1 gap-2">
            <Label>Comment</Label>
            <Input value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(r) => String(r.id)}
            searchFields={(r) => `${partyLabel(r.reviewer_user, r.reviewer_org)} ${partyLabel(r.reviewee_user, r.reviewee_org)} ${r.comment}`}
            exportFileName="reviews"
            paginate
            searchPlaceholder="Search by reviewer, reviewee or comment…"
            emptyMessage="No reviews yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- Threads -------------------------------- */

function ThreadsTab({ onSelect }: { onSelect: (thread: ApiThread) => void }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listThreadsApi({ page_size: 50 }), []);
  const [subject, setSubject] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setSubject("");
    setEditingId(null);
    setFormError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      if (editingId) await patchThreadApi(editingId, subject.trim() ? { subject: subject.trim() } : {});
      else await createThreadApi(subject.trim() ? { subject: subject.trim() } : {});
      resetForm();
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not reach the server.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteThreadApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiThread>[] = [
    { key: "subject", header: "Subject", render: (t) => t.subject || "(no subject)", exportValue: (t) => t.subject },
    { key: "created", header: "Created", render: (t) => new Date(t.created_at).toLocaleString(), exportValue: (t) => t.created_at },
    {
      key: "actions",
      header: "",
      render: (t) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => onSelect(t)}>
            Participants &amp; messages
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingId(t.id);
              setSubject(t.subject);
            }}
          >
            Rename
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(t.id)}>
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Rename thread" : "Start a thread"}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Creating a thread automatically seats you as its first participant.
        </p>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid min-w-[16rem] flex-1 gap-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save" : "Start thread"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(t) => String(t.id)}
            searchFields={(t) => t.subject}
            exportFileName="threads"
            paginate
            searchPlaceholder="Search by subject…"
            emptyMessage="No threads yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- Thread detail (participants + messages) -------------------------------- */

function ThreadDetail({ thread, users }: { thread: ApiThread; users: ApiUser[] }) {
  const participants = useApiList(() => listThreadUsersApi({ thread: thread.id, page_size: 100 }), [thread.id]);
  const messages = useApiList(() => listMessagesApi({ thread: thread.id, page_size: 100 }), [thread.id]);
  const [newParticipantId, setNewParticipantId] = useState("");
  const [senderId, setSenderId] = useState("");
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  function userLabel(id: number) {
    return users.find((u) => u.id === id)?.full_name ?? `User #${id}`;
  }

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault();
    if (!newParticipantId) return;
    setBusy(true);
    setFormError("");
    try {
      await createThreadUserApi({ thread: thread.id, user: Number(newParticipantId) });
      setNewParticipantId("");
      await participants.reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not add participant.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function removeParticipant(id: number) {
    try {
      await deleteThreadUserApi(id);
      await participants.reload();
    } catch {
      /* keep the current list if removal fails */
    }
  }

  async function markRead(id: number) {
    try {
      await markThreadReadApi(id);
      await participants.reload();
    } catch {
      /* no-op */
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!senderId || !body.trim()) return;
    setBusy(true);
    setFormError("");
    try {
      await createMessageApi({ thread: thread.id, sender: Number(senderId), body: body.trim() });
      setBody("");
      await messages.reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Could not send message.") : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMessage(id: number) {
    try {
      await deleteMessageApi(id);
      await messages.reload();
    } catch {
      /* no-op */
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="surface-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Participants — {thread.subject || "(no subject)"}</h3>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={addParticipant}>
          <Select value={newParticipantId} onValueChange={setNewParticipantId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Add a user…" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.full_name} ({u.phone})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" disabled={busy}>
            <Plus className="size-4" />
            Add
          </Button>
        </form>
        {participants.error && <ErrorBanner message={participants.error} />}
        <ul className="mt-4 space-y-2">
          {participants.items.map((p: ApiThreadUser) => (
            <li key={p.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
              <div>
                <p className="font-medium text-foreground">{userLabel(p.user)}</p>
                <p className="text-xs text-muted-foreground">
                  Joined {new Date(p.joined_at).toLocaleDateString()} · Last read{" "}
                  {p.last_read_at ? new Date(p.last_read_at).toLocaleString() : "never"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void markRead(p.id)}>
                  Mark read
                </Button>
                <Button size="sm" variant="outline" onClick={() => void removeParticipant(p.id)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
          {participants.items.length === 0 && !participants.loading && (
            <p className="text-sm text-muted-foreground">No participants yet.</p>
          )}
        </ul>
      </section>

      <section className="surface-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Messages</h3>
        <form className="mt-3 space-y-2" onSubmit={sendMessage}>
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-2">
              <Label>Sender</Label>
              <Select value={senderId} onValueChange={setSenderId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select a sender" />
                </SelectTrigger>
                <SelectContent>
                  {participants.items.map((p: ApiThreadUser) => (
                    <SelectItem key={p.user} value={String(p.user)}>
                      {userLabel(p.user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message…"
            rows={2}
          />
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Send
          </Button>
        </form>
        {messages.error && <ErrorBanner message={messages.error} />}
        <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto">
          {messages.items.map((m: ApiMessage) => (
            <li key={m.id} className="rounded-lg border border-border p-2 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{userLabel(m.sender)}</p>
                <Button size="sm" variant="ghost" onClick={() => void removeMessage(m.id)}>
                  Delete
                </Button>
              </div>
              <p className="text-muted-foreground">{m.body}</p>
              <p className="text-xs text-muted-foreground">{new Date(m.sent_at).toLocaleString()}</p>
            </li>
          ))}
          {messages.items.length === 0 && !messages.loading && (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          )}
        </ul>
      </section>
    </div>
  );
}

function ThreadsAndMessagesTab({ users }: { users: ApiUser[] }) {
  const [selectedThread, setSelectedThread] = useState<ApiThread | null>(null);

  if (selectedThread) {
    return (
      <div className="space-y-4">
        <Button size="sm" variant="outline" onClick={() => setSelectedThread(null)}>
          ← Back to all threads
        </Button>
        <ThreadDetail thread={selectedThread} users={users} />
      </div>
    );
  }

  return <ThreadsTab onSelect={setSelectedThread} />;
}

/* --------------------------------- Notifications -------------------------------- */

const NOTIF_TYPES: NotifType[] = ["listing_match", "order_status", "payment", "delivery", "dispute", "system"];
const NOTIF_CHANNELS: NotifChannel[] = ["in_app", "sms", "push", "email"];

function NotificationsTab({ users }: { users: ApiUser[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(
    () => listNotificationsApi({ page_size: 50 }),
    [],
  );
  const [userId, setUserId] = useState("");
  const [notifType, setNotifType] = useState<NotifType>("system");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<NotifChannel>("in_app");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setUserId("");
    setNotifType("system");
    setTitle("");
    setBody("");
    setChannel("in_app");
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !title.trim()) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    const payload: NotificationPayload = {
      user: Number(userId),
      notif_type: notifType,
      title: title.trim(),
      channel,
      ...(body.trim() ? { body: body.trim() } : {}),
    };
    try {
      await createNotificationApi(payload);
      resetForm();
      await reload();
    } catch (err) {
      const errBody = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(errBody) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(errBody));
    } finally {
      setBusy(false);
    }
  }

  async function toggleRead(n: ApiNotification) {
    try {
      if (n.is_read) await patchNotificationApi(n.id, { title: n.title, notif_type: n.notif_type, user: n.user });
      else await markNotificationReadApi(n.id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Update failed.") : "Could not reach the server.");
    }
  }

  async function remove(id: number) {
    try {
      await deleteNotificationApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiNotification>[] = [
    {
      key: "user",
      header: "Recipient",
      render: (n) => users.find((u) => u.id === n.user)?.full_name ?? `#${n.user}`,
      exportValue: (n) => users.find((u) => u.id === n.user)?.full_name ?? "",
    },
    { key: "title", header: "Title", render: (n) => n.title, exportValue: (n) => n.title },
    {
      key: "type",
      header: "Type",
      render: (n) => <Badge variant="secondary">{n.notif_type}</Badge>,
      exportValue: (n) => n.notif_type,
    },
    { key: "channel", header: "Channel", render: (n) => n.channel, exportValue: (n) => n.channel },
    {
      key: "read",
      header: "Read",
      render: (n) => (
        <Button size="sm" variant={n.is_read ? "secondary" : "outline"} onClick={() => void toggleRead(n)}>
          {n.is_read ? "Read" : "Mark read"}
        </Button>
      ),
      exportValue: (n) => (n.is_read ? "yes" : "no"),
    },
    {
      key: "actions",
      header: "",
      render: (n) => (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => void remove(n.id)}>
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Send a notification</h2>
        <p className="mt-1 text-xs text-muted-foreground">Staff-only — a recipient's only self-service write is marking one read.</p>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Recipient</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.full_name} ({u.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors["user"] && <p className="text-xs text-destructive">{fieldErrors["user"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={notifType} onValueChange={(v) => setNotifType(v as NotifType)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIF_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as NotifChannel)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIF_CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input className="w-56" value={title} onChange={(e) => setTitle(e.target.value)} required />
            {fieldErrors["title"] && <p className="text-xs text-destructive">{fieldErrors["title"]}</p>}
          </div>
          <div className="grid min-w-[16rem] flex-1 gap-2">
            <Label>Body</Label>
            <Input value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Send
          </Button>
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(n) => String(n.id)}
            searchFields={(n) => `${n.title} ${n.body} ${n.notif_type}`}
            exportFileName="notifications"
            paginate
            searchPlaceholder="Search by title, body or type…"
            emptyMessage="No notifications yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* ----------------------------------- Page ----------------------------------- */

function SocialDataPage() {
  const usersList = useApiList(() => listUsersApi({ page_size: 100 }), []);
  const organizationsList = useApiList(() => listOrganizationsApi({ page_size: 100 }), []);
  const ordersList = useApiList(() => listOrdersApi({ page_size: 100 }), []);

  return (
    <AppShell
      title="Social & messaging"
      description="Manage reviews, message threads and notifications on the live API."
    >
      <StaffAccessNotice />
      <Tabs defaultValue="reviews">
        <TabsList className="flex-wrap">
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="threads">Threads &amp; messages</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews">
          <ReviewsTab users={usersList.items} organizations={organizationsList.items} orders={ordersList.items} />
        </TabsContent>
        <TabsContent value="threads">
          <ThreadsAndMessagesTab users={usersList.items} />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab users={usersList.items} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
