import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { useWorkspace } from "@/lib/workspace-store";
import { LANGUAGE_LABELS, locations, type Language } from "@/lib/mock-data";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Agribridge" },
      { name: "description", content: "Manage your Agribridge profile, language and location." },
    ],
  }),
  component: Settings,
});

const nonRegionLocations = locations.filter((l) => l.level !== "region");

function Settings() {
  const { currentUser, updateProfile } = useWorkspace();
  const [name, setName] = useState(currentUser.name);
  const [language, setLanguage] = useState<Language>(currentUser.preferredLanguage);
  const [locationId, setLocationId] = useState(currentUser.locationId);
  const [nationalId, setNationalId] = useState(currentUser.nationalId ?? "");

  return (
    <AppShell title="Settings" description="Your Agribridge profile.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ShieldCheck}
          title="Reliability score"
          value={`${currentUser.reliabilityScore}/100`}
          tone="brand"
        />
        <StatCard
          icon={ShieldCheck}
          title="Verification"
          value={currentUser.isVerified ? "Verified" : "Not verified"}
          tone={currentUser.isVerified ? "success" : "warning"}
        />
      </div>

      <div className="surface-card max-w-2xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
          <ReliabilityBadge score={currentUser.reliabilityScore} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Phone number</Label>
            <Input value={currentUser.phone} disabled />
          </div>
          <div className="grid gap-2">
            <Label>Preferred language</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {nonRegionLocations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator className="my-6" />

        <h2 className="text-sm font-semibold text-foreground">Verification</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Optional — adding your national ID unlocks the verified badge once an admin confirms it.
        </p>
        <div className="mt-4 grid gap-2 sm:max-w-xs">
          <Label htmlFor="nationalId">National ID</Label>
          <Input
            id="nationalId"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            placeholder="1 1990 8 0123456 0 12"
          />
        </div>

        <div className="mt-6 flex gap-2">
          <Button
            onClick={() =>
              updateProfile({
                name,
                preferredLanguage: language,
                locationId,
                ...(nationalId ? { nationalId } : {}),
              })
            }
          >
            Save changes
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
