import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/user-avatar";
import { useWorkspace } from "@/lib/workspace-store";
import { ORGANIZATION_TYPE_LABELS, locationById } from "@/lib/mock-data";

export const Route = createFileRoute("/cooperatives")({
  head: () => ({
    meta: [
      { title: "Cooperatives — Agribridge" },
      {
        name: "description",
        content: "Registered farming cooperatives, their districts and member endorsements.",
      },
    ],
  }),
  component: CooperativesPage,
});

function CooperativesPage() {
  const { cooperatives, users, endorsements, userById, addEndorsement } = useWorkspace();
  const unverifiedFarmers = users.filter((u) => u.roles.includes("farmer") && !u.isVerified);
  const [endorsedId, setEndorsedId] = useState(unverifiedFarmers[0]?.id ?? "");
  const [note, setNote] = useState("");

  return (
    <AppShell
      allowedRoles={["admin"]}
      title="Cooperatives"
      description="Registered farmer cooperatives integrated with the platform."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} title="Cooperatives" value={cooperatives.length} tone="brand" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {cooperatives.map((coop) => {
          const members = users.filter((u) => u.cooperativeId === coop.id);
          return (
            <section key={coop.id} className="surface-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{coop.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {locationById(coop.districtId)?.name} · {coop.registrationNumber}
                  </p>
                </div>
                <Badge variant="secondary">{ORGANIZATION_TYPE_LABELS[coop.organizationType]}</Badge>
              </div>
              <div className="mt-4 flex -space-x-2">
                {members.slice(0, 6).map((m) => (
                  <UserAvatar key={m.id} user={m} className="border-2 border-card" />
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{members.length} member(s)</p>
            </section>
          );
        })}
      </div>

      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Community endorsements</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Cooperative leaders vouching for new farmers to solve the cold-start trust problem.
        </p>
        <ul className="mt-3 divide-y divide-border">
          {endorsements.length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">No endorsements yet.</li>
          )}
          {endorsements.map((e) => (
            <li key={e.id} className="py-3 text-sm">
              <span className="font-medium text-foreground">{userById(e.endorserId)?.name}</span>{" "}
              vouched for{" "}
              <span className="font-medium text-foreground">{userById(e.endorsedId)?.name}</span>
              <p className="mt-1 text-xs text-muted-foreground">{e.note}</p>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div className="grid gap-2">
            <label className="text-xs text-muted-foreground">Vouch for a farmer</label>
            <Select value={endorsedId} onValueChange={setEndorsedId}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unverifiedFarmers.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Why are you vouching for them?"
            className="min-w-[16rem] flex-1"
            rows={1}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            disabled={!endorsedId || !note.trim()}
            onClick={() => {
              addEndorsement({ endorsedId, note });
              setNote("");
            }}
          >
            Add endorsement
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
