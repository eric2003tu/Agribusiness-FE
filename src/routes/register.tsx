import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Package, ShieldCheck, ShoppingBasket, Sprout, Truck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace-store";
import { locations, ROLE_LABELS, type Role } from "@/lib/mock-data";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create an account — Agribridge" },
      { name: "description", content: "Register as a farmer, buyer, supplier or transporter on Agribridge." },
    ],
  }),
  component: RegisterPage,
});

const REGISTERABLE_ROLES: Role[] = ["farmer", "buyer", "supplier", "transporter"];
const ROLE_ICON: Record<Role, typeof Sprout> = {
  farmer: Sprout,
  buyer: ShoppingBasket,
  supplier: Package,
  transporter: Truck,
  admin: ShieldCheck,
};
const nonRegionLocations = locations.filter((l) => l.level !== "region");

function RegisterPage() {
  const { registerUser } = useWorkspace();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("farmer");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [locationId, setLocationId] = useState(nonRegionLocations[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  function submit() {
    if (!name.trim() || !phone.trim() || !locationId) return;
    setBusy(true);
    const result = registerUser({ name, phone, roles: [role], preferredLanguage: "en", locationId });
    setBusy(false);
    if (result.ok) void navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15 text-sm font-bold">
            AB
          </span>
          <span className="text-sm font-semibold">Agribridge</span>
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Connecting farmers, buyers and input suppliers across Rwanda.
          </h2>
          <p className="text-sm text-primary-foreground/80">
            List produce, get matched into bulk aggregation groups, pool input orders with nearby
            farmers, and track every transaction from first offer to delivery.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/70">Demo marketplace · mock data</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Create your Agribridge account
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell us who you are and how to reach you.
            </p>
          </div>

          <form
            className="surface-card space-y-4 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="grid gap-2">
              <Label>I am a…</Label>
              <div className="grid grid-cols-2 gap-2">
                {REGISTERABLE_ROLES.map((r) => {
                  const Icon = ROLE_ICON[r];
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors",
                        role === r
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-input text-foreground hover:bg-accent",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {ROLE_LABELS[r]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+250788000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
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

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
