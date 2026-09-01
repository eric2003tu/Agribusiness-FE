import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { useWorkspace } from "@/lib/workspace-store";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>): { thread?: string | undefined } => ({
    thread: typeof search["thread"] === "string" ? search["thread"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Messages — Agribridge" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const { thread: threadParam } = Route.useSearch();
  const navigate = useNavigate();
  const { currentUser, threadsForUser, messagesForThread, userById, sendMessage } = useWorkspace();
  const threads = threadsForUser(currentUser.id).sort((a, b) =>
    b.lastMessageAt.localeCompare(a.lastMessageAt),
  );
  const activeThreadId = threadParam ?? threads[0]?.id;
  const activeThread = threads.find((t) => t.id === activeThreadId);
  const activeMessages = activeThread ? messagesForThread(activeThread.id) : [];
  const [draft, setDraft] = useState("");

  const otherUserId = activeThread?.participantIds.find((id) => id !== currentUser.id);
  const otherUser = userById(otherUserId);

  return (
    <AppShell title="Messages" description="In-app conversations with matched buyers, sellers and suppliers.">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="surface-card overflow-hidden">
          <ul className="divide-y divide-border">
            {threads.length === 0 && (
              <li className="p-4 text-sm text-muted-foreground">No conversations yet.</li>
            )}
            {threads.map((t) => {
              const other = userById(t.participantIds.find((id) => id !== currentUser.id));
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/messages", search: { thread: t.id } })}
                    className={cn(
                      "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50",
                      t.id === activeThreadId && "bg-primary-soft",
                    )}
                  >
                    <UserAvatar user={other} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{other?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.subject}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="surface-card flex min-h-[26rem] flex-col">
          {activeThread ? (
            <>
              <div className="flex items-center gap-3 border-b border-border p-4">
                <UserAvatar user={otherUser} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{otherUser?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{activeThread.subject}</p>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {activeMessages.map((m) => {
                  const mine = m.senderId === currentUser.id;
                  return (
                    <div key={m.id} className={cn("flex", mine && "justify-end")}>
                      <div
                        className={cn(
                          "max-w-sm rounded-lg px-3 py-2 text-sm",
                          mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                        )}
                      >
                        <p>{m.body}</p>
                        <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {timeAgo(m.sentAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-end gap-2 border-t border-border p-3">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  rows={2}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  disabled={!draft.trim()}
                  onClick={() => {
                    sendMessage(activeThread.id, draft);
                    setDraft("");
                  }}
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-10 text-sm text-muted-foreground">
              Message a seller from any listing to start a conversation.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
